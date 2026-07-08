/**
 * AppDirect marketplace event endpoints — Express + TypeScript scaffold.
 *
 * Shows the CONTRACT, not a required framework. Adapt to the host app's stack.
 * These are the URLs registered in createProductIntegration (createUrl,
 * cancelUrl, upgradeUrl, notifyUrl, eventStatusUrl, assignUrl, unassignUrl).
 * A single shared route for all events is valid and used here.
 *
 * Requirements the ping test and completion score depend on:
 *  - HTTPS reachable from the public internet
 *  - Verifies AppDirect's outbound credentials (OAuth2 bearer here)
 *  - Responds success to ping/test events (e.g. SUBSCRIPTION_ORDER dry runs)
 */
import express, { Request, Response, NextFunction } from "express";

const router = express.Router();

/** Verify the bearer token AppDirect obtained from YOUR token endpoint
 *  (the outboundCredentials you configured). Replace with real validation. */
function verifyAppDirectAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ") || !isValidToken(auth.slice(7))) {
    return res.status(401).json({ success: false, errorCode: "UNAUTHORIZED" });
  }
  next();
}

type AppDirectEventType =
  | "SUBSCRIPTION_ORDER"
  | "SUBSCRIPTION_CHANGE"
  | "SUBSCRIPTION_CANCEL"
  | "SUBSCRIPTION_NOTICE"
  | "USER_ASSIGNMENT"
  | "USER_UNASSIGNMENT";

router.post("/appdirect/events", verifyAppDirectAuth, async (req, res) => {
  const eventType = req.body?.type as AppDirectEventType | undefined;

  try {
    switch (eventType) {
      case "SUBSCRIPTION_ORDER": {
        // Provision: create tenant/account, apply edition + pricing plan.
        const accountIdentifier = await provisionSubscription(req.body);
        // accountIdentifier is echoed back on future events for this subscription.
        return res.json({ success: true, accountIdentifier });
      }
      case "SUBSCRIPTION_CHANGE": {
        await changeSubscription(req.body); // upgrade/downgrade edition, seats
        return res.json({ success: true });
      }
      case "SUBSCRIPTION_CANCEL": {
        await deprovisionSubscription(req.body);
        return res.json({ success: true });
      }
      case "USER_ASSIGNMENT": {
        // MULTI_USER products only: grant a seat.
        await assignUser(req.body);
        return res.json({ success: true });
      }
      case "USER_UNASSIGNMENT": {
        await unassignUser(req.body);
        return res.json({ success: true });
      }
      case "SUBSCRIPTION_NOTICE":
      default:
        // Notices / ping probes: acknowledge success so ping tests pass.
        return res.json({ success: true });
    }
  } catch (err) {
    // Non-2xx or success:false tells AppDirect the event failed.
    return res
      .status(500)
      .json({ success: false, errorCode: "OPERATION_FAILED", message: String(err) });
  }
});

export default router;

// ---- Implement against your own domain layer ----
declare function isValidToken(token: string): boolean;
declare function provisionSubscription(payload: unknown): Promise<string>;
declare function changeSubscription(payload: unknown): Promise<void>;
declare function deprovisionSubscription(payload: unknown): Promise<void>;
declare function assignUser(payload: unknown): Promise<void>;
declare function unassignUser(payload: unknown): Promise<void>;
