# Backups and Restore Plan

## Target

- Daily database backups
- 30-day retention
- Regular restore drill in staging

## Recommended baseline

- Use the database provider's automated backups where available.
- Export a monthly offline snapshot for disaster recovery.
- Store restore instructions alongside deployment docs.

## Restore procedure

1. Identify backup point.
2. Restore to a staging database first.
3. Validate schema and critical endpoints.
4. Promote restore to production only after verification.

## Verification checklist

- Auth login works
- Public jobs endpoints respond
- Admin analytics endpoints respond
- File upload flow works
- Recent data integrity checks pass
