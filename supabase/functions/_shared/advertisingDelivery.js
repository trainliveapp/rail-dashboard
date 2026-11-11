// All delivery dependencies are server-only. This module never invents a recipient.
export function createAdvertisingSubmit({ configured, prepare, deliver, markDelivered }) {
  return async (input, ipHash) => {
    if (!configured) return 'unavailable'
    const record = await prepare(input, ipHash)
    if (record?.state === 'rate_limited') return 'rate_limited'
    if (!record?.id) return 'unavailable'
    if (record.state === 'sent') return 'success'
    const receipt = await deliver(input, record.id)
    if (!receipt?.id) return 'unavailable'
    await markDelivered(record.id, receipt.id)
    return 'success'
  }
}
