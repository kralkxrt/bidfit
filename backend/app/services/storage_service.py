from supabase import create_client, Client
from app.config import settings
from typing import Optional

class StorageService:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.bucket = "documents"
        
        # Only initialize if Supabase credentials are configured
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                self.supabase = create_client(
                    settings.SUPABASE_URL, 
                    settings.SUPABASE_SERVICE_KEY
                )
            except Exception as e:
                print(f"Warning: Failed to initialize Supabase client: {e}")
                self.supabase = None
        else:
            print("Warning: Supabase not configured (SUPABASE_URL or SUPABASE_SERVICE_KEY missing)")

    async def upload_file(self, file_content: bytes, filename: str, company_id: str) -> str:
        """
        Uploads a file to Supabase Storage.
        Returns the path to the file.
        """
        if not self.supabase:
            raise Exception("Supabase storage not configured")
            
        # Ensure bucket exists
        await self._ensure_bucket_exists()

        # Create a unique path: company_id/filename
        path = f"{company_id}/{filename}"
        
        # Upload
        res = self.supabase.storage.from_(self.bucket).upload(
            path=path,
            file=file_content,
            file_options={"upsert": "true"}
        )
        
        return path

    async def _ensure_bucket_exists(self):
        """Check if bucket exists, create if not."""
        if not self.supabase:
            return
        try:
            buckets = self.supabase.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            if self.bucket not in bucket_names:
                print(f"Bucket '{self.bucket}' not found. Creating...")
                self.supabase.storage.create_bucket(self.bucket, options={"public": False})
        except Exception as e:
            print(f"Error checking/creating bucket: {e}")


    async def get_signed_url(self, path: str, expiry_seconds: int = 3600) -> str:
        """
        Get a signed URL for viewing the file.
        Returns empty string if Supabase is not configured or on error.
        """
        if not self.supabase:
            return ''
            
        try:
            res = self.supabase.storage.from_(self.bucket).create_signed_url(
                path, expiry_seconds
            )
            # Handle both Supabase v1 and v2 response formats
            if isinstance(res, dict):
                return res.get('signedURL') or res.get('signedUrl') or res.get('signed_url', '')
            # For newer versions that return an object
            if hasattr(res, 'signed_url'):
                return res.signed_url
            return str(res) if res else ''
        except Exception as e:
            print(f"Error getting signed URL for {path}: {e}")
            return ''
