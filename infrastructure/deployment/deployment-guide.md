# Vesper Messenger - Enterprise Deployment & Production Operations Guide

## 1. System Architecture Overview

```
                      +-----------------------------+
                      | Mobile (iOS/Android Flutter)|
                      | Responsive Web (React SPA)  |
                      | Desktop App (Electron/PWA)  |
                      +--------------+--------------+
                                     |
                       HTTPS (TLS) / WSS (WebSockets)
                                     v
                      +-----------------------------+
                      | Nginx Load Balancer / Proxy |
                      | Rate Limiting + SSL Term.   |
                      +--------------+--------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
   +--------------------------+              +--------------------------+
   |  Vesper API & WS Node 1  |              |  Vesper API & WS Node 2  |
   |  (Port 3000)             |              |  (Port 3000)             |
   +------------+-------------+              +------------+-------------+
                |                                         |
                +--------------------+--------------------+
                                     |
     +-------------------------------+-------------------------------+
     |                               |                               |
     v                               v                               v
+----------------+          +----------------+              +----------------+
| PostgreSQL 16  |          | Redis 7 PubSub |              | S3 Compatible  |
| Primary / Read |          | Session Cache  |              | Media Storage  |
| Full-Text Gin  |          | Typing / Queue |              | MinIO / AWS S3 |
+----------------+          +----------------+              +----------------+
```

## 2. Horizontal Scaling & High Availability
- **WebSocket State Synchronization**: Multiple Node.js backend nodes connect via Redis Pub/Sub (`redis.publish('vesper:events', payload)`). A message received by Node 1 is immediately relayed to clients connected to Node 2 without state fragmentation.
- **WebRTC STUN/TURN**: Coturn server handles peer-to-peer traversal across Symmetric NATs. When direct P2P fails, media relays securely through Coturn TURN credentials over UDP/TCP 3478.

## 3. End-to-End Encryption (E2EE) Architecture
- **Transport Security**: TLS 1.3 with HSTS and forward secrecy for all HTTP and WebSocket connections.
- **Key Exchange**: Uses X25519 elliptic curve Diffie-Hellman (ECDH) key exchange.
- **Message Encryption**: Symmetric encryption using AES-256-GCM or ChaCha20-Poly1305 with Double Ratchet forward secrecy.
- **Key Distribution**: Users publish public identity keys to `/api/users/:id/keys`. Pre-keys are fetched upon conversation initialization; server stores only encrypted payloads and ephemeral key headers, with zero plaintext access.

## 4. Disaster Recovery & Database Maintenance
1. Automated daily backup:
   ```bash
   pg_dump -U postgres -Fc vesper_db > /backups/vesper_db_$(date +%F).dump
   ```
2. Restore database:
   ```bash
   pg_restore -U postgres -d vesper_db -c /backups/vesper_db_2026-10-01.dump
   ```
