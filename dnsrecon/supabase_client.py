import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache
def get_supabase_client() -> Client:
    """Return a Supabase client using the service role key (bypasses RLS)."""
    url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    return create_client(url, key)


def get_supabase_url() -> str:
    return os.environ.get('SUPABASE_URL', '')


def get_supabase_anon_key() -> str:
    return os.environ.get('SUPABASE_ANON_KEY', '')
