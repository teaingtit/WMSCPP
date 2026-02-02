#!/bin/sh
# One-time fix when server DNS is broken (e.g. systemd-resolved inactive, resolv.conf missing).
# Run on server: sudo ./fix-dns-server.sh

set -e
echo "Fixing /etc/resolv.conf with public DNS..."

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

rm -f /etc/resolv.conf
cat > /etc/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF
chmod 644 /etc/resolv.conf

echo "Testing DNS..."
if nslookup ghcr.io >/dev/null 2>&1; then
  echo "DNS OK (ghcr.io resolves)."
else
  echo "Warning: nslookup ghcr.io still failed. Check network."
  exit 1
fi

echo "Done. You can now run: cd /opt/wmscpp && docker compose pull && docker compose up -d"
