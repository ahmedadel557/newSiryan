import { Request } from 'express';
import AuditLog from '../models/AuditLog';

interface AuditParams {
  performedBy: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  req?: Request;
}

export function logAudit(params: AuditParams): void {
  const { performedBy, action, resource, resourceId, details, req } = params;
  const ip_address = req
    ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress
    : undefined;

  AuditLog.create({
    performed_by: performedBy,
    action,
    resource,
    resource_id: resourceId,
    details,
    ip_address,
  }).catch(() => { /* non-fatal */ });
}
