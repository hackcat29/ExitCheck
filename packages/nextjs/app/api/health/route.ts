export function GET() {
  return Response.json({
    status: 'ok',
    application: 'exitcheck',
    version: '1.0.0',
  });
}
