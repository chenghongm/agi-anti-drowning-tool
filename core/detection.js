// core/detection.js
// Detection module: receives an array of message DOM nodes from an Adapter
// and a list of branch pairs, computes start/mid/end roles and marks the nodes.

export function detectAndMark(messages, branchPairs, adapter) {
  if (!messages || messages.length === 0) return { marked: 0 };

  // Remove existing role attributes on the provided message nodes
  messages.forEach(el => el.removeAttribute('data-wb-role'));

  // Build id -> index mapping using adapter's id accessor
  const idIndex = new Map();
  messages.forEach((m, i) => {
    const id = adapter.getMessageId(m);
    if (id) idIndex.set(id, i);
  });

  let marked = 0;
  branchPairs.forEach(pair => {
    const startIdx = idIndex.get(pair.startId);
    const endIdx = idIndex.get(pair.endId);
    if (startIdx === undefined || endIdx === undefined) return;

    const start = messages[startIdx];
    const end = messages[endIdx];
    if (!start || !end) return;

    start.setAttribute('data-wb-role', 'start');
    end.setAttribute('data-wb-role', 'end');
    marked += 2;

    const from = Math.min(startIdx, endIdx), to = Math.max(startIdx, endIdx);
    for (let i = from + 1; i < to; i++) {
      messages[i].setAttribute('data-wb-role', 'mid');
      marked += 1;
    }
  });
  console.log(`WB Detection: Marked ${marked} messages.`);
  return { marked };
}
