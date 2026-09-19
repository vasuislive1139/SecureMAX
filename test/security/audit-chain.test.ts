import { describe, it, expect } from 'vitest';
import { auditService, computeCanonicalHash, sha256Hex } from '../../src/lib/audit/auditService';

describe('Canonical Audit Service & SHA-256 Hash Chain Integrity', () => {
  it('CHAINS AUDIT EVENTS: verifies deterministic SHA-256 hash chaining across all seed events', () => {
    const integrity = auditService.verifyIntegrity();
    expect(integrity.isValid).toBe(true);
    expect(integrity.verifiedEvents).toBeGreaterThanOrEqual(9);
    expect(integrity.brokenAt).toBeUndefined();
  });

  it('ENFORCES 4-LAYER TAXONOMY: segments events across Application, Blockchain, Security, and KMS', () => {
    const appEvents = auditService.getEvents({ layer: 'Application' });
    const blockchainEvents = auditService.getEvents({ layer: 'Blockchain' });
    const securityEvents = auditService.getEvents({ layer: 'Security' });
    const kmsEvents = auditService.getEvents({ layer: 'KMS' });

    expect(appEvents.length).toBeGreaterThan(0);
    expect(blockchainEvents.length).toBeGreaterThan(0);
    expect(securityEvents.length).toBeGreaterThan(0);
    expect(kmsEvents.length).toBeGreaterThan(0);
  });

  it('RECORDS CANONICAL EVENT: correctly links new event to previous hash', () => {
    const eventsBefore = auditService.getEvents();
    const prevHash = eventsBefore[0].integrity.event_hash;

    const newEvent = auditService.record({
      eventType: 'ASSET_DOWNLOADED',
      layer: 'Application',
      actor: {
        userId: 'usr_vasu_002',
        did: 'did:securemax:user:002',
        role: 'USER',
        userName: 'Vasu',
      },
      resource: {
        resourceType: 'ASSET',
        resourceId: 'ast_alpha',
        assetName: 'Project Alpha.pdf',
      },
      action: {
        operation: 'DOWNLOAD',
        permission: 'DOWNLOAD',
      },
      authorization: {
        result: 'ALLOWED',
        policy: 'ACTIVE_SESSION_ALLOW',
        reasonCode: 'USER_PERMISSION_VALIDATED',
      },
      description: 'Vasu downloaded ciphertext artifact for Project Alpha.pdf',
    });

    expect(newEvent.integrity.previous_event_hash).toBe(prevHash);
    expect(newEvent.integrity.event_hash).toBeDefined();

    // Verify integrity of updated chain
    const integrityAfter = auditService.verifyIntegrity();
    expect(integrityAfter.isValid).toBe(true);
    expect(integrityAfter.latestHash).toBe(newEvent.integrity.event_hash);
  });

  it('DETECTS TAMPERING: fails verification if any historical event hash or payload is modified', () => {
    const events = auditService.getEvents();
    const target = events[events.length - 2]; // older event

    // Tamper with target's hash
    const originalHash = target.integrity.event_hash;
    target.integrity.event_hash = '0xBADBEEF000000000000000000000000000000000000000000000000000000000';

    const check = auditService.verifyIntegrity();
    expect(check.isValid).toBe(false);
    expect(check.brokenAt).toBe(target.event_id);

    // Restore original hash
    target.integrity.event_hash = originalHash;
    const restoredCheck = auditService.verifyIntegrity();
    expect(restoredCheck.isValid).toBe(true);
  });

  it('EXPORTS AUDIT REPORT: produces cryptographically signed report with valid metadata and hash', () => {
    const report = auditService.generateExportReport('auditor@securemax.mil');
    expect(report.reportId).toMatch(/^SMR-/);
    expect(report.ledgerIntegrityStatus).toBe('VERIFIED_VALID');
    expect(report.reportHash).toBeDefined();
    expect(report.events.length).toBeGreaterThanOrEqual(10);
    expect(report.deniedAttemptsCount).toBeGreaterThanOrEqual(1);
    expect(report.securityIncidentsCount).toBeGreaterThanOrEqual(1);
  });
});
