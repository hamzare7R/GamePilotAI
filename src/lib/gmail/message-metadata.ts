export type ParsedSender = {
  senderAddress: string;
  senderDomain: string;
};

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/;

/**
 * Extracts the sender address from a `From` header. Display names are dropped
 * on purpose: they are free text and add no classification value.
 */
export function parseSenderAddress(fromHeader: string | undefined): ParsedSender | null {
  if (!fromHeader) return null;

  const angleMatch = fromHeader.match(/<([^>]+)>/);
  const candidate = (angleMatch?.[1] ?? fromHeader).trim();

  const match = candidate.match(EMAIL_PATTERN);
  if (!match) return null;

  const senderAddress = match[0].toLowerCase();
  const senderDomain = match[1]!.toLowerCase();
  return { senderAddress, senderDomain };
}

export function parseHeaderDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
