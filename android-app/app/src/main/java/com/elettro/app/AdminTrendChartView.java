package com.elettro.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.LinearGradient;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.View;

import java.util.ArrayList;
import java.util.List;

/** A small native chart used by the admin dashboard; it keeps the Android view independent of WebView/chart libraries. */
public class AdminTrendChartView extends View {
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path linePath = new Path();
    private final Path fillPath = new Path();
    private final List<Integer> values = new ArrayList<>();

    public AdminTrendChartView(Context context, AttributeSet attrs) {
        super(context, attrs);
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        gridPaint.setColor(Color.rgb(228, 235, 237));
        gridPaint.setStrokeWidth(dp(1));
        linePaint.setColor(Color.rgb(245, 182, 0));
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setStrokeWidth(dp(3));
        linePaint.setStrokeCap(Paint.Cap.ROUND);
        linePaint.setStrokeJoin(Paint.Join.ROUND);
        linePaint.setShadowLayer(dp(6), 0, dp(3), 0x556B4A00);
        dotPaint.setColor(Color.rgb(255, 195, 0));
        dotPaint.setStyle(Paint.Style.FILL);
        labelPaint.setColor(Color.rgb(125, 143, 148));
        labelPaint.setTextSize(dp(9));
        labelPaint.setTypeface(android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD));
    }

    public void setValues(List<Integer> nextValues) {
        values.clear();
        if (nextValues != null) values.addAll(nextValues);
        invalidate();
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float left = dp(8), right = getWidth() - dp(8), top = dp(12), bottom = getHeight() - dp(20);
        if (right <= left || bottom <= top) return;
        for (int i = 0; i < 4; i++) {
            float y = top + ((bottom - top) * i / 3f);
            canvas.drawLine(left, y, right, y, gridPaint);
        }
        if (values.isEmpty()) {
            canvas.drawText("No booking trend data yet", left, bottom + dp(12), labelPaint);
            return;
        }
        int max = 1;
        for (Integer value : values) if (value != null && value > max) max = value;
        float step = values.size() == 1 ? 0 : (right - left) / (values.size() - 1);
        linePath.reset();
        fillPath.reset();
        fillPath.moveTo(left, bottom);
        for (int i = 0; i < values.size(); i++) {
            float x = left + (step * i);
            int value = values.get(i) == null ? 0 : Math.max(0, values.get(i));
            float y = bottom - ((bottom - top) * value / max);
            if (i == 0) linePath.moveTo(x, y); else linePath.lineTo(x, y);
            fillPath.lineTo(x, y);
            if (i == values.size() - 1) fillPath.lineTo(x, bottom);
        }
        fillPath.close();
        fillPath.setFillType(Path.FillType.WINDING);
        Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        fillPaint.setShader(new LinearGradient(0, top, 0, bottom, 0x55FFC300, 0x05FFC300, Shader.TileMode.CLAMP));
        canvas.drawPath(fillPath, fillPaint);
        canvas.drawPath(linePath, linePaint);
        for (int i = 0; i < values.size(); i++) {
            float x = left + (step * i);
            int value = values.get(i) == null ? 0 : Math.max(0, values.get(i));
            float y = bottom - ((bottom - top) * value / max);
            canvas.drawCircle(x, y, dp(4), dotPaint);
            canvas.drawCircle(x, y, dp(2), Paints.white());
        }
        canvas.drawText("earlier", left, getHeight() - dp(4), labelPaint);
        String latest = "latest";
        canvas.drawText(latest, right - labelPaint.measureText(latest), getHeight() - dp(4), labelPaint);
    }

    private float dp(float value) { return value * getResources().getDisplayMetrics().density; }

    private static final class Paints {
        static Paint white() {
            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setColor(Color.WHITE);
            return paint;
        }
    }
}
