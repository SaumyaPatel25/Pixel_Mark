import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const alt = 'STAGE - Visual Website Feedback & Bug Reporting Tool';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #0a0a0f, #1e1b4b)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: '40px 80px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(to top right, #9333ea, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            P
          </div>
          <span style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-0.05em' }}>
            STAGE
          </span>
        </div>
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: '20px',
            maxWidth: '900px',
          }}
        >
          Visual Website Feedback & Bug Reporting Tool
        </h1>
        <p
          style={{
            fontSize: '24px',
            color: '#94a3b8',
            maxWidth: '800px',
            lineHeight: 1.5,
          }}
        >
          Share secure client review links to pin visual feedback, annotations, and QA comments directly on live web pages. No extensions required.
        </p>
        <div
          style={{
            display: 'flex',
            marginTop: '40px',
            gap: '12px',
            fontSize: '18px',
            color: '#a78bfa',
            fontWeight: 'bold',
          }}
        >
          <span>Entrext Labs</span>
          <span>•</span>
          <span>team@stage.dev</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
