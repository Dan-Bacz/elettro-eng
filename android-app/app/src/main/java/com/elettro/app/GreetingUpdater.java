package com.elettro.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.widget.TextView;

import java.util.Calendar;

final class GreetingUpdater {
    private static final long MINUTE_MILLIS = 60_000L;

    private final Context context;
    private final TextView greetingView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable updateRunnable = new Runnable() {
        @Override
        public void run() {
            updateGreeting();
            handler.postDelayed(this, MINUTE_MILLIS - (System.currentTimeMillis() % MINUTE_MILLIS));
        }
    };

    GreetingUpdater(Context context, TextView greetingView) {
        this.context = context;
        this.greetingView = greetingView;
    }

    void start() {
        handler.removeCallbacks(updateRunnable);
        updateRunnable.run();
    }

    void stop() {
        handler.removeCallbacks(updateRunnable);
    }

    private void updateGreeting() {
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        int greetingRes = hour < 12
                ? R.string.greeting_morning
                : hour < 17 ? R.string.greeting_afternoon : R.string.greeting_evening;
        greetingView.setText(greetingRes);
    }
}
