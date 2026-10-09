export const PENDING_REQUESTS_MESSAGE =
    'The action stopped with requests still pending; the deployment may be incomplete. Re-run the job.';

/**
 * Node exits 0 when the event loop drains, even if main() never settled. A
 * promise that never settles must never look like a green run.
 */
export function guardAgainstSilentExit(
    proc: { on(event: 'beforeExit', listener: () => void): unknown, exitCode?: number | string | null },
    hasSettled: () => boolean,
    setFailed: (message: string) => void
): void {
    proc.on('beforeExit', () => {
        if (!hasSettled()) {
            setFailed(PENDING_REQUESTS_MESSAGE);
            proc.exitCode = 1;
        }
    });
}
