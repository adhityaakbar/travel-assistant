import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TIMEFRAME_DAYS = {
  '7D': 7,
  '14D': 14,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '2Y': 730,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const currency = (searchParams.get('currency') || 'JPY').toUpperCase();
  const timeframe = (searchParams.get('timeframe') || '7D').toUpperCase();

  const days = TIMEFRAME_DAYS[timeframe] || 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  try {
    const res = await fetch(`https://api.frankfurter.app/${startStr}..${endStr}?from=${currency}&to=IDR`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`Frankfurter API response not ok: ${res.status}`);
    }

    const data = await res.json();
    const ratesMap = data.rates || {};
    const dates = Object.keys(ratesMap).sort();

    if (!dates.length) {
      return NextResponse.json({ success: false, error: 'No historical data found' }, { status: 404 });
    }

    const points = dates.map((date) => ({
      date,
      rate: ratesMap[date].IDR,
    }));

    const startRate = points[0].rate;
    const endRate = points[points.length - 1].rate;
    const changePct = Number((((endRate - startRate) / startRate) * 100).toFixed(2));

    const rates = points.map((p) => p.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    // Downsample for chart line rendering if points > 40
    let chartPoints = points;
    if (points.length > 40) {
      const step = Math.ceil(points.length / 40);
      chartPoints = points.filter((_, idx) => idx % step === 0 || idx === points.length - 1);
    }

    return NextResponse.json({
      success: true,
      currency,
      timeframe,
      startRate,
      endRate,
      changePct,
      minRate,
      maxRate,
      dataPointsCount: points.length,
      chartPoints,
      startDate: points[0].date,
      endDate: points[points.length - 1].date,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
