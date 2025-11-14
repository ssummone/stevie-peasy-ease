/**
 * API route to proxy Replicate API calls
 * Handles CORS and authentication
 */

import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, payload } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing API token' },
        { status: 401 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action' },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === 'create-prediction') {
      const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (action === 'get-prediction') {
      const { predictionId } = payload;

      if (!predictionId) {
        return NextResponse.json(
          { error: 'Missing predictionId' },
          { status: 400 }
        );
      }

      const response = await fetch(
        `${REPLICATE_API_URL}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (action === 'create-video') {
      const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (action === 'get-video') {
      const { predictionId } = payload;

      if (!predictionId) {
        return NextResponse.json(
          { error: 'Missing predictionId' },
          { status: 400 }
        );
      }

      const response = await fetch(
        `${REPLICATE_API_URL}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Replicate proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
