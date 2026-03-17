"""
Management command to generate a VAPID key pair for Web Push notifications.

Usage:
    python manage.py generate_vapid_keys

Output:
    Prints VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as base64url-encoded strings
    ready to paste into your .env file.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate a VAPID key pair for Web Push / push notification support"

    def handle(self, *args, **options):
        try:
            from py_vapid import Vapid
        except ImportError:
            self.stderr.write(
                self.style.ERROR(
                    "pywebpush is not installed. Run: pip install pywebpush"
                )
            )
            return

        vapid = Vapid()
        vapid.generate_keys()

        import base64

        from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

        # Public key: uncompressed EC point format (65 bytes), base64url-encoded.
        # This is what browsers expect for pushManager.subscribe applicationServerKey.
        raw_public = vapid.public_key.public_bytes(
            Encoding.X962, PublicFormat.UncompressedPoint
        )
        public_b64 = base64.urlsafe_b64encode(raw_public).rstrip(b"=").decode("ascii")

        # Private key: raw 32-byte EC scalar, base64url-encoded (no padding).
        # py_vapid.from_string() expects this format (not PEM).
        private_value = vapid.private_key.private_numbers().private_value
        raw_private_bytes = private_value.to_bytes(32, "big")
        private_b64 = (
            base64.urlsafe_b64encode(raw_private_bytes).rstrip(b"=").decode("ascii")
        )

        self.stdout.write(
            self.style.SUCCESS("\n✅ VAPID key pair generated successfully!\n")
        )
        self.stdout.write("Add the following variables to your .env file:\n")
        self.stdout.write("-" * 60)
        self.stdout.write(f"VAPID_PUBLIC_KEY={public_b64}")
        self.stdout.write("")
        self.stdout.write(f"VAPID_PRIVATE_KEY={private_b64}")
        self.stdout.write("-" * 60)
        self.stdout.write(
            "\n⚠️  Keep VAPID_PRIVATE_KEY secret. "
            "The public key is shared with browsers."
        )
        self.stdout.write(
            "ℹ️  Re-generating keys will invalidate all existing push subscriptions."
        )
        self.stdout.write("")
