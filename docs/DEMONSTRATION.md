# Simple demonstration and acceptance checklist

Use a fresh database for predictable starting values. Log in as Administrator. Keep your private setup passwords off slides/screenshots.

## 1. Dashboard and catalogue

- Show the five fruits, nine supplier provinces and Small/Medium/Large boxes.
- Open Box sizes & prices: there are 15 fruit/size products. Edit one price and its units per box; save and reopen it to confirm persistence.
- On Fruits, all five initially active means Add/reactivate is disabled with a catalogue explanation.
- Deactivate Apples. The Add/reactivate control now offers Apples. Reactivate it and confirm the existing prices remain unchanged.
- Edit a description, search for the fruit and test Active/Inactive filtering.

## 2. Receive stock

- Open Stock → Receive stock.
- Supplier: Cape Orchards (Western Cape). Fruit: Apples. Size: Small.
- Enter 20 boxes, cost per box M30, and today's date. Save.
- Available stock should increase by 20 boxes; Purchase history should show the supplier, province, fruit, size and cost M600.
- Try sourcing Bananas from the Western Cape supplier. The application should reject that combination.
- Try zero or negative quantities. The form/API should reject them.

## 3. Orders and the box-size filter

- Register a vendor, or use an active sample vendor.
- Select the Small box-size filter on Orders.
- Create an order for 3 Small boxes of Apples. It should immediately appear while the filter stays selected.
- Open it. Check vendor, date, fruit, size, quantity, unit price, subtotal, total and Pending status.
- Try to order more boxes than available: it must fail.
- Create a multi-item order after receiving the necessary stock. Check that totals add up correctly.

## 4. Status sequence and stock

- For the 3-box order: Confirmed → Processing → Ready for Collection/Delivery → Completed.
- Only the next step or Cancelled should be offered before completion; skipping is rejected by the API too.
- If the stock began at 20, it should now be 17. Reopen the order: no more status changes should be offered.
- Create another 2-box order and cancel it. Stock must remain 17.
- Pending orders do not reserve stock. If insufficient stock remains when completing another order, completion must be rejected without a partial deduction.

## 5. Reports

- Available Stock: check 17 Small Apple boxes if you used only the simple example above.
- Sales by Fruit, Box Size and Street Vendor: check that the completed 3-box order appears.
- Purchases by Province: check Western Cape purchase totals.
- Pending Orders: includes unfinished orders; excludes Completed and Cancelled.
- Completed Orders: includes the completed order.
- Total Sales by Date: check the completed order's recorded order date and amount.
- Cancelled orders must not increase sales totals. Dashboard sales should agree with reports.

## 6. Sales role

- Log out and log in as Sales.
- Register a vendor, create/view an order and progress it through Confirmed, Processing and Ready.
- Sales must not be able to complete it, edit prices, receive/adjust stock, manage suppliers or view reports.
- A backend request attempting an Administrator-only operation must return HTTP 403; changing the frontend interface cannot grant permission.

## 7. Responsive layout and submission

- Check navigation, forms, modals and horizontally scrollable tables at desktop and phone widths.
- Refresh a page; verify that data persists and expired sessions require login.
- Show README, SQL schema and docs/ERD.md in your presentation.
- Include your actual GitHub URL and a truthful contribution table with each member's name and work.
