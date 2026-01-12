from supabase import create_client, Client
from app.config import settings

class StorageService:
    def __init__(self):
        self.supabase: Client = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_KEY
        )
        self.bucket = "documents"

    async def upload_file(self, file_content: bytes, filename: str, company_id: str) -> str:
        """
        Uploads a file to Supabase Storage.
        Returns the path to the file.
        """
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
        """
        res = self.supabase.storage.from_(self.bucket).create_signed_url(
            path, expiry_seconds
        )
        # res is typically {'signedURL': '...'} or object
        # Supabase-py v2 might satisfy directly
        return res['signedURL']
