export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await fetch('http://127.0.0.1:7417/ingest/82c3587d-d330-4a4b-80b2-03f00bd50fa1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'ebb559',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch {
    // Intentionally swallow instrumentation errors.
  }

  return Response.json({ ok: true });
}
