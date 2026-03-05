import asyncio
import hashlib
import os
import secrets
import threading
import time
import traceback
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from loguru import logger

from dnsrecon.auth import get_admin_user, get_approved_user, get_current_user_with_profile
from dnsrecon.models import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    ScanCreate,
    ScanDetailResponse,
    ScanListResponse,
    ScanResponse,
    ScanResultResponse,
    ScanStatus,
    ScanType,
    StatsResponse,
    SupabaseConfigResponse,
)
from dnsrecon.supabase_client import get_supabase_anon_key, get_supabase_client, get_supabase_url

router = APIRouter(prefix='/api', tags=['web'])


@router.get('/config', response_model=SupabaseConfigResponse)
async def get_config() -> SupabaseConfigResponse:
    """Public endpoint returning Supabase connection info for the frontend."""
    return SupabaseConfigResponse(url=get_supabase_url(), anon_key=get_supabase_anon_key())



@router.get('/me')
async def get_me(
    user: Annotated[dict, Depends(get_current_user_with_profile)],
) -> dict:
    """Return the current user's profile including role."""
    return {
        'id': user['id'],
        'email': user.get('email'),
        'role': user['profile_role'],
        'display_name': user.get('display_name'),
    }


@router.post('/scans', response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(
    body: ScanCreate,
    background_tasks: BackgroundTasks,
    user: Annotated[dict, Depends(get_approved_user)],
) -> ScanResponse:
    """Create a new scan and start it as a background task."""
    client = get_supabase_client()

    row = {
        'user_id': user['id'],
        'domain': body.domain,
        'scan_type': body.scan_type.value,
        'status': ScanStatus.PENDING.value,
        'options': body.options,
    }
    result = client.table('scans').insert(row).execute()
    scan = result.data[0]

    background_tasks.add_task(_run_scan, scan['id'], body.scan_type, body.domain, body.options)

    return ScanResponse(**scan)


@router.get('/scans', response_model=ScanListResponse)
async def list_scans(
    user: Annotated[dict, Depends(get_approved_user)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    scan_status: ScanStatus | None = None,
) -> ScanListResponse:
    """List the authenticated user's scans with pagination."""
    client = get_supabase_client()
    offset = (page - 1) * per_page

    query = client.table('scans').select('*', count='exact').eq('user_id', user['id'])
    if scan_status:
        query = query.eq('status', scan_status.value)

    result = query.order('created_at', desc=True).range(offset, offset + per_page - 1).execute()

    scans = [ScanResponse(**row) for row in result.data]
    return ScanListResponse(scans=scans, total=result.count or 0)


@router.get('/scans/{scan_id}', response_model=ScanDetailResponse)
async def get_scan(
    scan_id: str,
    user: Annotated[dict, Depends(get_approved_user)],
) -> ScanDetailResponse:
    """Get a single scan with all its results."""
    client = get_supabase_client()

    scan_result = client.table('scans').select('*').eq('id', scan_id).eq('user_id', user['id']).execute()
    if not scan_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Scan not found')

    results_result = client.table('scan_results').select('*').eq('scan_id', scan_id).order('created_at').execute()

    return ScanDetailResponse(
        scan=ScanResponse(**scan_result.data[0]),
        results=[ScanResultResponse(**r) for r in results_result.data],
    )


@router.delete('/scans/{scan_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: str,
    user: Annotated[dict, Depends(get_approved_user)],
) -> None:
    """Delete a scan and its results (cascade)."""
    client = get_supabase_client()

    scan_result = client.table('scans').select('id').eq('id', scan_id).eq('user_id', user['id']).execute()
    if not scan_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Scan not found')

    client.table('scans').delete().eq('id', scan_id).execute()


@router.get('/stats', response_model=StatsResponse)
async def get_stats(
    user: Annotated[dict, Depends(get_approved_user)],
) -> StatsResponse:
    """Return aggregate statistics for the authenticated user."""
    client = get_supabase_client()

    all_scans = client.table('scans').select('id, status, domain', count='exact').eq('user_id', user['id']).execute()
    total = all_scans.count or 0

    completed = sum(1 for s in all_scans.data if s['status'] == 'completed')
    domains = len({s['domain'] for s in all_scans.data})

    scan_ids = [s['id'] for s in all_scans.data]
    total_records = 0
    if scan_ids:
        for scan_id in scan_ids:
            res = client.table('scan_results').select('id', count='exact').eq('scan_id', scan_id).execute()
            total_records += res.count or 0

    return StatsResponse(
        total_scans=total,
        completed_scans=completed,
        total_records_found=total_records,
        domains_scanned=domains,
    )


# --- API Keys ---


@router.post('/api-keys', response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    user: Annotated[dict, Depends(get_approved_user)],
) -> ApiKeyCreatedResponse:
    """Generate a new API key. The raw key is only shown once."""
    client = get_supabase_client()
    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    result = client.table('api_keys').insert({
        'user_id': user['id'],
        'key_hash': key_hash,
        'name': body.name,
    }).execute()

    row = result.data[0]
    return ApiKeyCreatedResponse(id=row['id'], name=row['name'], key=raw_key, created_at=row['created_at'])


@router.get('/api-keys', response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: Annotated[dict, Depends(get_approved_user)],
) -> list[ApiKeyResponse]:
    client = get_supabase_client()
    result = client.table('api_keys').select('*').eq('user_id', user['id']).order('created_at', desc=True).execute()
    return [ApiKeyResponse(**row) for row in result.data]


@router.delete('/api-keys/{key_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: str,
    user: Annotated[dict, Depends(get_approved_user)],
) -> None:
    client = get_supabase_client()
    result = client.table('api_keys').select('id').eq('id', key_id).eq('user_id', user['id']).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='API key not found')
    client.table('api_keys').delete().eq('id', key_id).execute()


# --- Admin User Management ---


@router.get('/admin/users', tags=['admin'])
async def list_users(
    user: Annotated[dict, Depends(get_admin_user)],
) -> list[dict]:
    """List all user profiles (admin only)."""
    client = get_supabase_client()
    result = client.table('profiles').select('*').order('created_at', desc=True).execute()
    users_data = result.data or []

    auth_users = client.auth.admin.list_users()
    email_map = {str(u.id): u.email for u in auth_users}

    for profile in users_data:
        profile['email'] = email_map.get(profile['id'], 'unknown')
    return users_data


@router.patch('/admin/users/{user_id}', tags=['admin'])
async def update_user_role(
    user_id: str,
    body: dict,
    user: Annotated[dict, Depends(get_admin_user)],
) -> dict:
    """Update a user's role (admin only)."""
    new_role = body.get('role')
    if new_role not in ('admin', 'approved', 'guest'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid role')

    client = get_supabase_client()
    result = client.table('profiles').update({'role': new_role}).eq('id', user_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return result.data[0]


@router.delete('/admin/users/{user_id}', status_code=status.HTTP_204_NO_CONTENT, tags=['admin'])
async def delete_user(
    user_id: str,
    user: Annotated[dict, Depends(get_admin_user)],
) -> None:
    """Delete a user and their profile (admin only)."""
    if user_id == user['id']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot delete yourself')

    client = get_supabase_client()
    client.table('profiles').delete().eq('id', user_id).execute()
    try:
        client.auth.admin.delete_user(user_id)
    except Exception:
        pass


# --- Background scan runner with incremental streaming & cancellation ---

_running_scans: dict[str, threading.Event] = {}


class _CallbackList(list):
    """A list subclass that calls a callback on every append."""

    def __init__(self, callback):
        super().__init__()
        self._callback = callback

    def append(self, item):
        super().append(item)
        self._callback(item)


def _result_to_row(scan_id: str, result: dict) -> dict:
    return {
        'scan_id': scan_id,
        'record_type': result.get('type', 'Unknown'),
        'name': result.get('name', ''),
        'address': result.get('address', ''),
        'target': result.get('target'),
        'port': result.get('port'),
        'raw_data': result,
    }


def _flush_results(client, scan_id: str, queue: list, lock: threading.Lock, total_flushed: list[int]) -> None:
    """Drain the shared queue, insert rows into Supabase, and update progress."""
    with lock:
        if not queue:
            return
        pending = list(queue)
        queue.clear()

    for i in range(0, len(pending), 50):
        client.table('scan_results').insert(pending[i : i + 50]).execute()

    total_flushed[0] += len(pending)
    client.table('scans').update({'progress': total_flushed[0]}).eq('id', scan_id).execute()


@router.post('/scans/{scan_id}/cancel', status_code=status.HTTP_200_OK)
async def cancel_scan(
    scan_id: str,
    user: Annotated[dict, Depends(get_approved_user)],
) -> dict:
    """Cancel a running scan."""
    client = get_supabase_client()
    scan_result = client.table('scans').select('id, status').eq('id', scan_id).eq('user_id', user['id']).execute()
    if not scan_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Scan not found')

    if scan_result.data[0]['status'] not in ('pending', 'running'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Scan is not running')

    cancel_event = _running_scans.get(scan_id)
    if cancel_event:
        cancel_event.set()
    else:
        client.table('scans').update({
            'status': ScanStatus.CANCELLED.value,
            'completed_at': datetime.now(UTC).isoformat(),
        }).eq('id', scan_id).execute()

    return {'status': 'cancelling'}


async def _run_scan(scan_id: str, scan_type: ScanType, domain: str, options: dict) -> None:
    """Execute a DNS scan in a background thread with incremental result flushing."""
    client = get_supabase_client()
    cancel_event = threading.Event()
    _running_scans[scan_id] = cancel_event

    client.table('scans').update({
        'status': ScanStatus.RUNNING.value,
        'started_at': datetime.now(UTC).isoformat(),
        'progress': 0,
    }).eq('id', scan_id).execute()

    result_queue: list[dict] = []
    queue_lock = threading.Lock()
    total_flushed: list[int] = [0]

    def on_result(record: dict):
        if isinstance(record, dict):
            with queue_lock:
                result_queue.append(_result_to_row(scan_id, record))

    try:
        results = await asyncio.to_thread(
            _execute_scan_streaming, scan_id, scan_type, domain, options, on_result, cancel_event, client, result_queue, queue_lock, total_flushed,
        )

        _flush_results(client, scan_id, result_queue, queue_lock, total_flushed)

        if cancel_event.is_set():
            client.table('scans').update({
                'status': ScanStatus.CANCELLED.value,
                'completed_at': datetime.now(UTC).isoformat(),
                'progress': total_flushed[0],
            }).eq('id', scan_id).execute()
        else:
            if results:
                for r in results:
                    if isinstance(r, dict):
                        row = _result_to_row(scan_id, r)
                        with queue_lock:
                            result_queue.append(row)
                _flush_results(client, scan_id, result_queue, queue_lock, total_flushed)

            client.table('scans').update({
                'status': ScanStatus.COMPLETED.value,
                'completed_at': datetime.now(UTC).isoformat(),
                'progress': total_flushed[0],
            }).eq('id', scan_id).execute()

    except Exception as e:
        logger.error(f'Scan {scan_id} failed: {e}\n{traceback.format_exc()}')
        _flush_results(client, scan_id, result_queue, queue_lock, total_flushed)
        client.table('scans').update({
            'status': ScanStatus.FAILED.value,
            'completed_at': datetime.now(UTC).isoformat(),
            'error_message': str(e),
            'progress': total_flushed[0],
        }).eq('id', scan_id).execute()
    finally:
        _running_scans.pop(scan_id, None)


def _execute_scan_streaming(
    scan_id: str,
    scan_type: ScanType,
    domain: str,
    options: dict,
    on_result,
    cancel_event: threading.Event,
    client,
    result_queue: list,
    queue_lock: threading.Lock,
    total_flushed: list[int],
) -> list[dict] | None:
    """Run the DNS operation with periodic flushing and cancellation support."""
    from dnsrecon.cli import (
        brute_domain,
        brute_reverse,
        brute_srv,
        brute_tlds,
        check_bindversion,
        check_nxdomain_hijack,
        check_recursive,
        check_wildcard,
        ds_zone_walk,
        general_enum,
        in_cache,
    )
    from dnsrecon.lib.dnshelper import DnsHelper

    rd = options.get('recursion_desired', True)
    thread_num = options.get('thread_num', 10)
    timeout = options.get('timeout', 3)

    flush_stop = threading.Event()

    def flush_loop():
        while not flush_stop.is_set():
            time.sleep(3)
            try:
                _flush_results(client, scan_id, result_queue, queue_lock, total_flushed)
            except Exception as exc:
                logger.warning(f'Flush error for scan {scan_id}: {exc}')

    flusher = threading.Thread(target=flush_loop, daemon=True)
    flusher.start()

    try:
        return _do_scan(
            scan_type, domain, options, on_result, cancel_event,
            rd, thread_num, timeout,
        )
    finally:
        flush_stop.set()
        flusher.join(timeout=5)


def _do_scan(
    scan_type: ScanType,
    domain: str,
    options: dict,
    on_result,
    cancel_event: threading.Event,
    rd: bool,
    thread_num: int,
    timeout: int,
) -> list[dict] | None:
    """Run the actual DNS operation. Long-running scans use _CallbackList for incremental results."""
    from dnsrecon.cli import (
        brute_domain,
        brute_reverse,
        brute_srv,
        brute_tlds,
        check_bindversion,
        check_nxdomain_hijack,
        check_recursive,
        check_wildcard,
        ds_zone_walk,
        general_enum,
        in_cache,
    )
    from dnsrecon.lib.dnshelper import DnsHelper

    match scan_type:
        case ScanType.GENERAL_ENUM:
            res = DnsHelper(domain, recursion_desired=rd)
            results = general_enum(
                res=res,
                domain=domain,
                do_axfr=options.get('do_axfr', False),
                do_bing=options.get('do_bing', False),
                do_yandex=options.get('do_yandex', False),
                do_spf=options.get('do_spf', False),
                do_whois=options.get('do_whois', False),
                do_crt=options.get('do_crt', False),
                do_shodan=options.get('do_shodan', False),
                shodan_api_key=options.get('shodan_api_key'),
                shodan_active=options.get('shodan_active', False),
                zw=options.get('zone_walk', False),
                request_timeout=timeout,
                thread_num=thread_num,
            )
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.BRUTE_DOMAIN:
            res = DnsHelper(domain, recursion_desired=rd)
            wordlist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'subdomains-top1mil-5000.txt')
            cb_list = _CallbackList(on_result)
            brute_domain(
                res=res,
                dictfile=wordlist,
                dom=domain,
                filter_=None,
                verbose=False,
                ignore_wildcard=not options.get('filter_wildcards', True),
                thread_num=thread_num,
            )
            if cancel_event.is_set():
                return None
            return None

        case ScanType.BRUTE_REVERSE:
            res = DnsHelper('example.com', recursion_desired=rd)
            ip_range = options.get('ip_range', domain)
            if '-' in ip_range:
                start_ip, end_ip = ip_range.split('-', 1)
                ip_list = [
                    f'{start_ip.rsplit(".", 1)[0]}.{i}'
                    for i in range(int(start_ip.split('.')[-1]), int(end_ip.split('.')[-1]) + 1)
                ]
            else:
                ip_list = [ip_range]
            results = brute_reverse(res=res, ip_list=ip_list, verbose=False, thread_num=thread_num)
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.BRUTE_SRV:
            res = DnsHelper(domain, recursion_desired=rd)
            results = brute_srv(res=res, domain=domain, verbose=False, thread_num=thread_num)
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.BRUTE_TLDS:
            res = DnsHelper(domain, recursion_desired=rd)
            results = brute_tlds(res=res, domain=domain, verbose=False, thread_num=thread_num)
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.ZONE_WALK:
            res = DnsHelper(domain)
            results = ds_zone_walk(res=res, domain=domain, request_timeout=timeout)
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.WILDCARD_CHECK:
            res = DnsHelper(domain)
            ips = check_wildcard(res, domain)
            if ips:
                records = [{'type': 'Wildcard', 'name': domain, 'address': ip} for ip in ips]
            else:
                records = [{'type': 'Wildcard', 'name': domain, 'address': 'No wildcard'}]
            for r in records:
                on_result(r)
            return None

        case ScanType.AXFR_TEST:
            res = DnsHelper(domain)
            results = res.zone_transfer()
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.CAA_RECORDS:
            res = DnsHelper(domain)
            raw = res.get_caa()
            if raw:
                for r in raw:
                    if len(r) >= 3:
                        on_result({'type': r[0], 'name': r[1], 'address': r[2]})
            return None

        case ScanType.CACHE_SNOOP:
            res = DnsHelper('example.com')
            ns = options.get('nameserver', domain)
            dict_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'namelist.txt')
            results = in_cache(res=res, dict_file=dict_file, ns=ns)
            if results:
                for r in results:
                    on_result(r)
            return None

        case ScanType.BIND_VERSION:
            res = DnsHelper('example.com')
            ns = options.get('nameserver', domain)
            version = check_bindversion(res=res, ns_server=ns, timeout=timeout)
            record = {'type': 'BIND', 'name': ns, 'address': version or 'Not detected'}
            on_result(record)
            return None

        case ScanType.RECURSIVE_CHECK:
            res = DnsHelper('example.com')
            ns = options.get('nameserver', domain)
            result = check_recursive(res=res, ns_server=ns, timeout=timeout)
            record = {'type': 'Recursion', 'name': ns, 'address': result or 'Not enabled'}
            on_result(record)
            return None

        case ScanType.NXDOMAIN_HIJACK:
            ns = options.get('nameserver', domain)
            result = check_nxdomain_hijack(nameserver=ns)
            record = {'type': 'NXDOMAIN', 'name': ns, 'address': result or 'No hijacking detected'}
            on_result(record)
            return None

    return None
