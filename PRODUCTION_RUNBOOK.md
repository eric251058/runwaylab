# RunwayLab Production Runbook

## Uploads

Runtime uploads must be served directly by Nginx. The `/uploads/` location should alias the persistent public upload directory:

```nginx
location /uploads/ {
  alias /var/www/runwaylab/public/uploads/;
}
```

Do not rely on Next.js static asset handling for files created after the build. Runtime uploads are written after deployment and need the Nginx alias above to stay visible in standalone mode.

Keep only one effective `server` block for the production host. Previous deployments have seen conflicting `server_name` warnings; duplicated blocks can make `/uploads/` appear fixed in one vhost while another vhost still routes requests incorrectly.

This document does not change Nginx or PM2 configuration. Apply server changes manually during deployment review.
