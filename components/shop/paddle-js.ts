// Paddle.js v2, loaded once per page from Paddle's CDN and initialised with the account's client-side token (public by
// design). Paddle allows one Initialize per page, so every caller shares it; `onEvent` is the first caller's.

export type PaddleEvent = { name?: string };
export type PaddleJs = {
  Environment: { set: (env: string) => void };
  Initialize: (options: { token: string; checkout?: { settings?: Record<string, unknown> }; eventCallback?: (e: PaddleEvent) => void }) => void;
  Checkout: { open: (options: { transactionId: string; settings?: Record<string, unknown> }) => void };
};

export const PADDLE_JS = "https://cdn.paddle.com/paddle/v2/paddle.js";

let ready: Promise<PaddleJs> | null = null;

export function loadPaddle(token: string, onEvent: (e: PaddleEvent) => void): Promise<PaddleJs> {
  ready ??= new Promise<PaddleJs>((resolve, reject) => {
    const start = () => {
      const paddle = (window as unknown as { Paddle?: PaddleJs }).Paddle;
      if (!paddle) return reject(new Error("Paddle.js didn't load"));
      if (token.startsWith("test_")) paddle.Environment.set("sandbox");
      paddle.Initialize({ token, eventCallback: onEvent });
      resolve(paddle);
    };
    if ((window as unknown as { Paddle?: PaddleJs }).Paddle) return start();
    const script = document.createElement("script");
    script.src = PADDLE_JS;
    script.async = true;
    script.onload = start;
    script.onerror = () => reject(new Error("Paddle.js didn't load"));
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    ready = null;
    throw e;
  });
  return ready;
}
