package com.elettro.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.elettro.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

public class DepartmentDashboardActivity extends AppCompatActivity {
    public static final String EXTRA_ROLE = "department_role";
    public static final String EXTRA_NAME = "department_name";
    private static final int PAD = 16;

    private final Handler clockHandler = new Handler(Looper.getMainLooper());
    private final Runnable clockRunnable = new Runnable() {
        @Override public void run() {
            if (clockView != null) {
                java.text.SimpleDateFormat format = new java.text.SimpleDateFormat("h:mm:ss a", Locale.getDefault());
                clockView.setText(format.format(new java.util.Date()));
            }
            if (greetingView != null) greetingView.setText(greetingForHour());
            clockHandler.postDelayed(this, 1000);
        }
    };

    private String role;
    private String displayName;
    private TextView greetingView;
    private TextView clockView;
    private TextView statusView;
    private LinearLayout content;
    private JSONArray inventory = new JSONArray();
    private JSONArray requests = new JSONArray();
    private JSONArray salesLines = new JSONArray();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        role = getIntent().getStringExtra(EXTRA_ROLE);
        displayName = getIntent().getStringExtra(EXTRA_NAME);
        if (!"SALES".equals(role) && !"WAREHOUSE".equals(role)) {
            finish();
            return;
        }
        buildScreen();
        clockHandler.post(clockRunnable);
        loadData();
    }

    @Override
    protected void onDestroy() {
        clockHandler.removeCallbacks(clockRunnable);
        super.onDestroy();
    }

    private void buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(245, 247, 249));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(PAD, PAD, PAD, PAD);
        header.setBackgroundColor(Color.rgb(11, 15, 16));
        greetingView = new TextView(this);
        greetingView.setTextSize(20);
        greetingView.setTextColor(Color.WHITE);
        greetingView.setTypeface(null, android.graphics.Typeface.BOLD);
        greetingView.setText(greetingForHour());
        header.addView(greetingView);
        clockView = new TextView(this);
        clockView.setTextColor(Color.rgb(245, 196, 0));
        clockView.setTextSize(14);
        header.addView(clockView);
        TextView departmentLabel = new TextView(this);
        departmentLabel.setText(("WAREHOUSE".equals(role) ? "Warehouse" : "Sales") + " · " + (displayName == null ? "" : displayName));
        departmentLabel.setTextColor(Color.LTGRAY);
        departmentLabel.setTextSize(12);
        header.addView(departmentLabel);
        root.addView(header);

        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(PAD, PAD, PAD, PAD);
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout actions = new LinearLayout(this);
        actions.setGravity(Gravity.CENTER);
        actions.setPadding(8, 8, 8, 8);
        Button refresh = button("Refresh");
        refresh.setOnClickListener(v -> loadData());
        actions.addView(refresh, new LinearLayout.LayoutParams(0, -2, 1));
        Button receipts = button("Receipts");
        receipts.setOnClickListener(v -> loadReceipts());
        actions.addView(receipts, new LinearLayout.LayoutParams(0, -2, 1));
        Button logout = button("Log out");
        logout.setOnClickListener(v -> logout());
        actions.addView(logout, new LinearLayout.LayoutParams(0, -2, 1));
        root.addView(actions);

        statusView = new TextView(this);
        statusView.setPadding(PAD, 0, PAD, PAD);
        statusView.setTextColor(Color.DKGRAY);
        root.addView(statusView);
        setContentView(root);
    }

    private String greetingForHour() {
        int hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
        String greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        return greeting + (displayName == null || displayName.trim().isEmpty() ? "" : ", " + displayName);
    }

    private void loadData() {
        statusView.setText("Loading…");
        new Thread(() -> {
            try {
                String requestResponse = ApiClient.get("/warehouse-requests");
                JSONObject requestJson = parseResponse(requestResponse);
                JSONArray loadedRequests = requestJson.optJSONArray("requests");
                String inventoryResponse = ApiClient.get("/inventory");
                JSONArray loadedInventory = new JSONArray(inventoryResponse == null ? "[]" : inventoryResponse);
                runOnUiThread(() -> {
                    requests = loadedRequests == null ? new JSONArray() : loadedRequests;
                    inventory = loadedInventory;
                    statusView.setText("");
                    renderContent();
                });
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText("Could not load department data. Check your connection and refresh."));
            }
        }).start();
    }

    private JSONObject parseResponse(String response) throws Exception {
        if (response == null || response.trim().isEmpty()) throw new Exception("Empty response");
        JSONObject json = new JSONObject(response);
        if (json.has("error")) throw new Exception(json.optString("error"));
        return json;
    }

    private void renderContent() {
        greetingView.setText(greetingForHour());
        content.removeAllViews();
        if ("SALES".equals(role)) renderSales();
        else renderWarehouse();
    }

    private void renderSales() {
        heading("Create warehouse request");
        if (inventory.length() == 0) {
            text(content, "No products are available for requests yet.");
        }

        ArrayList<JSONObject> productChoices = new ArrayList<>();
        ArrayList<String> labels = new ArrayList<>();
        for (int i = 0; i < inventory.length(); i++) {
            JSONObject item = inventory.optJSONObject(i);
            if (item == null) continue;
            productChoices.add(item);
            labels.add(item.optString("name", "Product") + " · stock " + item.optInt("quantity"));
        }
        Spinner productSpinner = new Spinner(this);
        productSpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, labels));
        content.addView(productSpinner);
        EditText quantityInput = edit("Quantity", InputType.TYPE_CLASS_NUMBER);
        content.addView(quantityInput);
        Button addLine = button("Add product");
        addLine.setEnabled(!productChoices.isEmpty());
        content.addView(addLine);
        TextView linesText = text(content, "No products added.");
        EditText customerRef = edit("Customer / job reference", InputType.TYPE_CLASS_TEXT);
        content.addView(customerRef);
        EditText projectRef = edit("Project reference", InputType.TYPE_CLASS_TEXT);
        content.addView(projectRef);
        EditText requestNotes = edit("Notes", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        content.addView(requestNotes);

        salesLines = new JSONArray();
        addLine.setOnClickListener(v -> {
            int position = productSpinner.getSelectedItemPosition();
            int quantity;
            try { quantity = Integer.parseInt(quantityInput.getText().toString().trim()); }
            catch (Exception e) { quantity = 0; }
            if (position < 0 || position >= productChoices.size() || quantity < 1) {
                Toast.makeText(this, "Select a product and enter a positive whole-number quantity", Toast.LENGTH_SHORT).show();
                return;
            }
            JSONObject product = productChoices.get(position);
            for (int i = 0; i < salesLines.length(); i++) {
                if (product.optString("id").equals(salesLines.optJSONObject(i).optString("inventoryItemId"))) {
                    Toast.makeText(this, "That product is already in the request", Toast.LENGTH_SHORT).show();
                    return;
                }
            }
            JSONObject line = new JSONObject();
            try {
                line.put("inventoryItemId", product.optString("id"));
                line.put("quantity", quantity);
                salesLines.put(line);
            } catch (Exception ignored) {}
            linesText.setText(salesLineSummary(productChoices));
            quantityInput.setText("");
        });

        Button submit = button("Send request to warehouse");
        submit.setEnabled(!productChoices.isEmpty());
        content.addView(submit);
        submit.setOnClickListener(v -> submitSalesRequest(customerRef.getText().toString(), projectRef.getText().toString(), requestNotes.getText().toString()));

        heading("My requests");
        boolean any = false;
        for (int i = 0; i < requests.length(); i++) {
            JSONObject request = requests.optJSONObject(i);
            if (request == null) continue;
            any = true;
            StringBuilder details = new StringBuilder(request.optString("reference")).append(" · ").append(request.optString("status").replace('_', ' '));
            JSONArray items = request.optJSONArray("items");
            if (items != null) for (int j = 0; j < items.length(); j++) {
                JSONObject line = items.optJSONObject(j);
                JSONObject product = line == null ? null : line.optJSONObject("inventoryItem");
                if (line != null) details.append("\n").append(product == null ? "Product" : product.optString("name"))
                        .append(": ").append(line.optInt("releasedQuantity")).append("/").append(line.optInt("requestedQuantity")).append(" released");
            }
            card(details.toString());
        }
        if (!any) text(content, "You have not submitted any warehouse requests.");
    }

    private String salesLineSummary(ArrayList<JSONObject> products) {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < salesLines.length(); i++) {
            JSONObject line = salesLines.optJSONObject(i);
            if (line == null) continue;
            for (JSONObject product : products) {
                if (product.optString("id").equals(line.optString("inventoryItemId"))) {
                    if (text.length() > 0) text.append("\n");
                    text.append(line.optInt("quantity")).append(" × ").append(product.optString("name"));
                }
            }
        }
        return text.length() == 0 ? "No products added." : text.toString();
    }

    private void submitSalesRequest(String customer, String project, String notes) {
        if (salesLines.length() == 0) {
            Toast.makeText(this, "Add at least one product", Toast.LENGTH_SHORT).show();
            return;
        }
        JSONObject payload = new JSONObject();
        try {
            payload.put("items", salesLines);
            payload.put("customerReference", customer);
            payload.put("projectReference", project);
            payload.put("notes", notes);
            payload.put("idempotencyKey", UUID.randomUUID().toString());
        } catch (Exception e) {
            Toast.makeText(this, "Could not prepare request", Toast.LENGTH_SHORT).show();
            return;
        }
        runApiAction("/warehouse-requests", payload, "Request submitted", this::loadData);
    }

    private void renderWarehouse() {
        heading("Stock actions");
        Button receive = button("Receive stock");
        receive.setOnClickListener(v -> showStockDialog("receive"));
        content.addView(receive);
        Button adjust = button("Adjust stock");
        adjust.setOnClickListener(v -> showStockDialog("adjust"));
        content.addView(adjust);

        heading("Requests to review");
        boolean any = false;
        for (int i = 0; i < requests.length(); i++) {
            JSONObject request = requests.optJSONObject(i);
            if (request == null) continue;
            any = true;
            String status = request.optString("status");
            JSONObject requester = request.optJSONObject("requester");
            JSONObject order = request.optJSONObject("order");
            String title = request.optString("reference") + " · " + status.replace('_', ' ');
            String subtitle = "From " + (requester == null ? "Sales" : requester.optString("name", "Sales"))
                    + " · " + request.optString("customerReference", "No customer reference");
            JSONArray items = request.optJSONArray("items");
            StringBuilder body = new StringBuilder(title).append("\n").append(subtitle);
            if (items != null) for (int j = 0; j < items.length(); j++) {
                JSONObject line = items.optJSONObject(j);
                if (line == null) continue;
                JSONObject product = line.optJSONObject("inventoryItem");
                body.append("\n").append(product == null ? "Product" : product.optString("name"))
                        .append(": ").append(line.optInt("releasedQuantity")).append("/").append(line.optInt("requestedQuantity"))
                        .append(" · stock ").append(product == null ? 0 : product.optInt("quantity"));
            }
            card(body.toString());
            if ("PENDING".equals(status)) {
                Button review = button("Accept for review");
                review.setOnClickListener(v -> updateRequestStatus(request.optString("id"), "UNDER_REVIEW"));
                content.addView(review);
                Button reject = button("Reject request");
                reject.setOnClickListener(v -> updateRequestStatus(request.optString("id"), "REJECTED"));
                content.addView(reject);
            } else if ("UNDER_REVIEW".equals(status) || "PARTIALLY_FULFILLED".equals(status)) {
                if (order != null && !("APPROVED".equals(order.optString("status")) || "PROCESSING".equals(order.optString("status")))) {
                    text(content, "Client order release is available after admin approval.");
                } else if (order != null && "GCASH".equals(order.optString("paymentMethod")) && !"PAID".equals(order.optString("paymentStatus"))) {
                    text(content, "Verify the GCash payment before releasing this order.");
                } else {
                    Button release = button("Physically verify and release");
                    release.setOnClickListener(v -> showReleaseDialog(request));
                    content.addView(release);
                }
            }
        }
        if (!any) text(content, "There are no warehouse requests to review.");

        heading("Current inventory");
        for (int i = 0; i < inventory.length(); i++) {
            JSONObject item = inventory.optJSONObject(i);
            if (item != null) card(item.optString("name") + " · " + item.optInt("quantity") + " " + item.optString("unit", "pcs"));
        }
    }

    private void updateRequestStatus(String requestId, String status) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("id", requestId);
            payload.put("status", status);
        } catch (Exception e) {
            Toast.makeText(this, "Could not update request", Toast.LENGTH_SHORT).show();
            return;
        }
        new Thread(() -> {
            try {
                String response = ApiClient.patch("/warehouse-requests", payload.toString());
                JSONObject result = new JSONObject(response == null ? "{}" : response);
                if (result.has("error")) throw new Exception(result.optString("error"));
                runOnUiThread(() -> {
                    Toast.makeText(this, "Request updated", Toast.LENGTH_SHORT).show();
                    loadData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage() == null ? "Could not update request" : e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void showReleaseDialog(JSONObject request) {
        JSONArray items = request.optJSONArray("items");
        if (items == null || items.length() == 0) {
            Toast.makeText(this, "This request has no items", Toast.LENGTH_SHORT).show();
            return;
        }
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(PAD, PAD, PAD, PAD);
        ArrayList<ReleaseInput> inputs = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            JSONObject product = item.optJSONObject("inventoryItem");
            int requested = item.optInt("requestedQuantity");
            int remaining = Math.max(0, requested - item.optInt("releasedQuantity"));
            int stock = product == null ? 0 : product.optInt("quantity");
            TextView label = text(layout, (product == null ? "Product" : product.optString("name")) + " · remaining " + remaining + " · stock " + stock);
            label.setPadding(0, 8, 0, 4);
            CheckBox verified = new CheckBox(this);
            verified.setText("Physically verified");
            layout.addView(verified);
            EditText quantity = edit("Release quantity", InputType.TYPE_CLASS_NUMBER);
            quantity.setText(String.valueOf(Math.min(remaining, stock)));
            layout.addView(quantity);
            EditText unavailable = edit("Unavailable quantity", InputType.TYPE_CLASS_NUMBER);
            unavailable.setText("0");
            layout.addView(unavailable);
            EditText discrepancy = edit("Discrepancy notes (required for short quantities)", InputType.TYPE_CLASS_TEXT);
            layout.addView(discrepancy);
            inputs.add(new ReleaseInput(item.optString("id"), remaining, verified, quantity, unavailable, discrepancy));
        }
        EditText notes = edit("Release notes", InputType.TYPE_CLASS_TEXT);
        layout.addView(notes);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(layout);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Verify " + request.optString("reference"))
                .setView(scroll)
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Save release", null)
                .create();
        dialog.setOnShowListener(v -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(button -> {
            try {
                JSONArray releaseItems = new JSONArray();
                for (ReleaseInput input : inputs) {
                    if (!input.verified.isChecked()) continue;
                    int amount = parseWholeNumber(input.quantity);
                    int unavailableAmount = parseWholeNumber(input.unavailable);
                    if (amount < 0 || unavailableAmount < 0 || amount + unavailableAmount > input.remaining) {
                        throw new Exception("Release and unavailable quantities exceed the remaining amount.");
                    }
                    JSONObject line = new JSONObject();
                    line.put("requestItemId", input.id);
                    line.put("quantity", amount);
                    line.put("unavailableQuantity", unavailableAmount);
                    line.put("discrepancyNotes", input.discrepancy.getText().toString().trim());
                    line.put("verified", true);
                    releaseItems.put(line);
                }
                if (releaseItems.length() == 0) throw new Exception("Physically verify at least one item.");
                JSONObject payload = new JSONObject();
                payload.put("requestId", request.optString("id"));
                payload.put("items", releaseItems);
                payload.put("notes", notes.getText().toString().trim());
                payload.put("idempotencyKey", UUID.randomUUID().toString());
                dialog.dismiss();
                runRelease(payload);
            } catch (Exception e) {
                Toast.makeText(this, e.getMessage() == null ? "Check the release quantities" : e.getMessage(), Toast.LENGTH_LONG).show();
            }
        }));
        dialog.show();
    }

    private int parseWholeNumber(EditText input) throws Exception {
        String value = input.getText().toString().trim();
        if (value.isEmpty()) return 0;
        int result = Integer.parseInt(value);
        if (result < 0) throw new Exception("Quantities cannot be negative.");
        return result;
    }

    private void runRelease(JSONObject payload) {
        new Thread(() -> {
            try {
                String response = ApiClient.post("/warehouse-releases", payload.toString());
                JSONObject result = new JSONObject(response == null ? "{}" : response);
                if (result.has("error")) throw new Exception(result.optString("error"));
                JSONObject release = result.optJSONObject("release");
                String receipt = release == null ? "" : release.optString("receiptNumber");
                runOnUiThread(() -> {
                    Toast.makeText(this, "Release recorded " + receipt, Toast.LENGTH_LONG).show();
                    loadData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage() == null ? "Could not record release" : e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void showStockDialog(String action) {
        if (inventory.length() == 0) {
            Toast.makeText(this, "No products are available", Toast.LENGTH_SHORT).show();
            return;
        }
        LinearLayout layout = new LinearLayout(this);
        layout.setPadding(PAD, 0, PAD, 0);
        layout.setOrientation(LinearLayout.VERTICAL);
        Spinner spinner = new Spinner(this);
        ArrayList<JSONObject> choices = new ArrayList<>();
        ArrayList<String> labels = new ArrayList<>();
        for (int i = 0; i < inventory.length(); i++) {
            JSONObject item = inventory.optJSONObject(i);
            if (item != null) {
                choices.add(item);
                labels.add(item.optString("name") + " · " + item.optInt("quantity"));
            }
        }
        spinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, labels));
        layout.addView(spinner);
        EditText quantity = edit(action.equals("receive") ? "Quantity received" : "Signed adjustment (+/-)", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_SIGNED);
        layout.addView(quantity);
        EditText reason = edit("Reason / supplier / reference", InputType.TYPE_CLASS_TEXT);
        layout.addView(reason);
        new AlertDialog.Builder(this).setTitle(action.equals("receive") ? "Receive stock" : "Adjust stock")
                .setView(layout).setNegativeButton("Cancel", null)
                .setPositiveButton("Record", (dialog, which) -> {
                    int position = spinner.getSelectedItemPosition();
                    int amount;
                    try { amount = Integer.parseInt(quantity.getText().toString().trim()); }
                    catch (Exception e) { amount = 0; }
                    if (position < 0 || position >= choices.size() || amount == 0 || reason.getText().toString().trim().isEmpty()) {
                        Toast.makeText(this, "Choose a product, quantity, and reason", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    JSONObject payload = new JSONObject();
                    try {
                        payload.put("action", action);
                        payload.put("inventoryItemId", choices.get(position).optString("id"));
                        payload.put("quantity", amount);
                        payload.put("reason", reason.getText().toString().trim());
                    } catch (Exception e) {
                        Toast.makeText(this, "Could not prepare stock movement", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    runApiAction("/warehouse-stock", payload, "Stock movement recorded", this::loadData);
                }).show();
    }

    private void loadReceipts() {
        new Thread(() -> {
            try {
                String response = ApiClient.get("/warehouse-receipts");
                JSONObject json = parseResponse(response);
                JSONArray receipts = json.optJSONArray("receipts");
                StringBuilder summary = new StringBuilder();
                if (receipts != null) {
                    for (int i = 0; i < receipts.length(); i++) {
                        JSONObject receipt = receipts.optJSONObject(i);
                        if (receipt == null) continue;
                        if (summary.length() > 0) summary.append("\n\n");
                        summary.append(receipt.optString("reference"));
                        JSONObject snapshot = receipt.optJSONObject("snapshot");
                        if (snapshot != null) summary.append("\n").append(snapshot.optString("requestReference"))
                                .append(" · ").append(snapshot.optString("releaseDate"));
                    }
                }
                String message = summary.length() == 0 ? "No receipts found." : summary.toString();
                runOnUiThread(() -> new AlertDialog.Builder(this).setTitle("Release receipts").setMessage(message).setPositiveButton("Close", null).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage() == null ? "Could not load receipts" : e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void runApiAction(String path, JSONObject payload, String success, Runnable after) {
        new Thread(() -> {
            try {
                String response = ApiClient.post(path, payload.toString());
                JSONObject json = new JSONObject(response == null ? "{}" : response);
                if (json.has("error")) throw new Exception(json.optString("error"));
                runOnUiThread(() -> {
                    Toast.makeText(this, success, Toast.LENGTH_SHORT).show();
                    after.run();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage() == null ? "Action failed" : e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void logout() {
        ApiClient.setAuthToken(null);
        getSharedPreferences("elettro_login", MODE_PRIVATE).edit().remove(MainActivity.KEY_TOKEN).apply();
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }

    private void heading(String value) {
        TextView view = text(content, value);
        view.setTextSize(17);
        view.setTypeface(null, android.graphics.Typeface.BOLD);
        view.setPadding(0, 18, 0, 8);
    }

    private TextView text(LinearLayout parent, String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(Color.rgb(35, 44, 49));
        view.setTextSize(13);
        view.setPadding(0, 5, 0, 5);
        parent.addView(view);
        return view;
    }

    private void card(String value) {
        TextView view = text(content, value);
        view.setBackgroundResource(R.drawable.bg_card);
        view.setPadding(PAD, PAD, PAD, PAD);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, 4, 0, 8);
        view.setLayoutParams(params);
    }

    private EditText edit(String hint, int inputType) {
        EditText input = new EditText(this);
        input.setSingleLine(inputType != (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE));
        input.setInputType(inputType);
        input.setHint(hint);
        input.setTextSize(14);
        return input;
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setTextColor(Color.rgb(11, 15, 16));
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(245, 196, 0)));
        return button;
    }

    private static class ReleaseInput {
        final String id;
        final int remaining;
        final CheckBox verified;
        final EditText quantity;
        final EditText unavailable;
        final EditText discrepancy;

        ReleaseInput(String id, int remaining, CheckBox verified, EditText quantity, EditText unavailable, EditText discrepancy) {
            this.id = id;
            this.remaining = remaining;
            this.verified = verified;
            this.quantity = quantity;
            this.unavailable = unavailable;
            this.discrepancy = discrepancy;
        }
    }
}
