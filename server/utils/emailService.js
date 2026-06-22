const axios = require("axios");

const sendVerificationEmail = async (toEmail, code, type = "verify") => {
  const isReset = type === "reset";
  const subject = isReset
    ? "Reset your Limo's Bakery password"
    : "Welcome to Limo's Bakery — confirm your account";
  const heading = isReset ? "PASSWORD RESET" : "ACCOUNT CONFIRMATION";
  const message = isReset
    ? 'We received a request to reset your password. Enter the code below to continue. It expires in <strong style="color:#c4712a !important">10 minutes</strong>.'
    : 'Welcome to Limo\'s Bakery! Please enter the code below to confirm your account. It expires in <strong style="color:#c4712a !important">10 minutes</strong>.';

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: { email: process.env.EMAIL_USER, name: "Limo's Bakery" },
      to: [{ email: toEmail }],
      subject,
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body bgcolor="#faf7f2" style="margin:0;padding:0;background-color:#faf7f2;font-family:Georgia,serif;color:#1a0f05;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf7f2">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
          <tr><td bgcolor="#c4712a" height="3" style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:48px 40px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <p style="font-size:11px;letter-spacing:0.25em;color:#c4712a;margin:0 0 6px 0;font-family:Georgia,serif;">LIMO'S</p>
              <p style="font-size:26px;font-weight:900;color:#1a0f05;margin:0 0 4px 0;font-family:Georgia,serif;font-style:italic;">Bakery</p>
              <p style="font-size:11px;letter-spacing:0.2em;color:#8a7060;margin:0 0 40px 0;font-family:Georgia,serif;">${heading}</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr><td bgcolor="#e8ddd0" height="1" style="height:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
              <p style="font-size:15px;font-weight:300;line-height:1.8;margin:0 0 32px 0;color:#1a0f05;font-family:Georgia,serif;">${message}</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td bgcolor="#faf7f2" align="center" style="border:1px solid #c4712a;border-radius:12px;padding:32px;text-align:center;">
                    <p style="font-size:11px;letter-spacing:0.3em;color:#8a7060;margin:0 0 16px 0;font-family:Georgia,serif;">YOUR CODE</p>
                    <p style="font-size:44px;font-weight:700;letter-spacing:0.35em;color:#c4712a;margin:0;font-family:Georgia,serif;">${code}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr><td bgcolor="#e8ddd0" height="1" style="height:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
              <p style="font-size:12px;color:#8a7060;line-height:1.7;margin:0;font-family:Georgia,serif;">
                If you did not request this, you can safely ignore this email.<br/>
                This code expires in 10 minutes and can only be used once.
              </p>
            </td>
          </tr>
          <tr><td bgcolor="#c4712a" height="3" style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:20px;background-color:#faf7f2;">
              <p style="font-size:11px;color:#c0a898;margin:0;font-family:Georgia,serif;letter-spacing:0.1em;">
                © 2026 Limo's Bakery · Tanta, Egypt
              </p>
              <p style="font-size:10px;color:#c0a898;margin:8px 0 0 0;font-family:Georgia,serif;">
                This email was sent to ${toEmail} because of activity on your Limo's Bakery account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  console.log("Email sent to", toEmail);
};

const sendOrderNotification = async (order) => {
  const customerName = order.guestInfo?.name || order.user?.name || "Guest";
  const customerPhone = order.guestInfo?.phone || order.checkoutPhone || "N/A";

  const subtotal = order.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:14px;color:#1a0f05;">
          ${item.productName}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:14px;color:#8a7060;text-align:center;">
          ${item.selectedSize}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:14px;color:#8a7060;text-align:center;">
          ×${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:14px;color:#1a0f05;text-align:right;">
          ${(item.price * item.quantity).toLocaleString()} EGP
        </td>
      </tr>
    `,
    )
    .join("");

  const subtotalRow = `
    <tr>
      <td colspan="3" style="padding:10px 0 4px;font-family:Georgia,serif;font-size:13px;color:#8a7060;">
        Subtotal
      </td>
      <td style="padding:10px 0 4px;font-family:Georgia,serif;font-size:13px;color:#8a7060;text-align:right;">
        ${subtotal.toLocaleString()} EGP
      </td>
    </tr>
  `;

  const deliveryRow = order.deliveryRegion
    ? `
    <tr>
      <td colspan="3" style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#8a7060;">
        Delivery — ${order.deliveryRegion.name}
      </td>
      <td style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#8a7060;text-align:right;">
        ${
          order.deliveryRegion.price === 0
            ? "Free"
            : `${order.deliveryRegion.price.toLocaleString()} EGP`
        }
      </td>
    </tr>
  `
    : "";

  const discountRow =
    order.discountCode && order.discountSavings > 0
      ? `
      <tr>
        <td colspan="3" style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#7a9a60;">
          Discount (${order.discountCode})
        </td>
        <td style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#7a9a60;text-align:right;">
          −${order.discountSavings.toLocaleString()} EGP
        </td>
      </tr>
    `
      : "";

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: { email: process.env.EMAIL_USER, name: "Limo's Bakery" },
      to: [{ email: process.env.EMAIL_USER }],
      subject: `🧁 New Order — ${customerName} · ${order.totalPrice.toLocaleString()} EGP`,
      htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body bgcolor="#faf7f2" style="margin:0;padding:0;background-color:#faf7f2;font-family:Georgia,serif;color:#1a0f05;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr><td bgcolor="#c4712a" height="3" style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:32px 40px 24px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <p style="font-size:11px;letter-spacing:0.25em;color:#c4712a;margin:0 0 4px 0;">LIMO'S</p>
              <p style="font-size:24px;font-weight:900;color:#1a0f05;margin:0 0 4px 0;font-style:italic;">New Order Received</p>
              <p style="font-size:12px;color:#8a7060;margin:0;">
                ${new Date(order.createdAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:0 40px 24px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#faf7f2;border:1px solid #e8ddd0;border-radius:10px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="font-size:11px;letter-spacing:0.2em;color:#8a7060;margin:0 0 14px 0;">CUSTOMER</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;width:100px;">Name</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Phone</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">${customerPhone}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Address</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">${order.deliveryAddress}</td>
                      </tr>
                      ${
                        order.deliveryRegion
                          ? `
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Region</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">${order.deliveryRegion.name}</td>
                      </tr>
                      `
                          : ""
                      }
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Payment</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;text-transform:capitalize;">${order.paymentMethod}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:0 40px 24px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <p style="font-size:11px;letter-spacing:0.2em;color:#8a7060;margin:0 0 12px 0;">ORDER ITEMS</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <th style="font-size:11px;color:#8a7060;text-align:left;padding-bottom:8px;font-weight:500;">Item</th>
                  <th style="font-size:11px;color:#8a7060;text-align:center;padding-bottom:8px;font-weight:500;">Size</th>
                  <th style="font-size:11px;color:#8a7060;text-align:center;padding-bottom:8px;font-weight:500;">Qty</th>
                  <th style="font-size:11px;color:#8a7060;text-align:right;padding-bottom:8px;font-weight:500;">Price</th>
                </tr>
                ${itemsRows}
                ${subtotalRow}
                ${deliveryRow}
                ${discountRow}
                <tr>
                  <td colspan="3" style="padding:12px 0 0;border-top:1px solid #e8ddd0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1a0f05;">
                    Total paid
                  </td>
                  <td style="padding:12px 0 0;border-top:1px solid #e8ddd0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#c4712a;text-align:right;">
                    ${order.totalPrice.toLocaleString()} EGP
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:0 40px 32px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <p style="font-size:10px;color:#c0a898;margin:0;">Order ID: ${order._id}</p>
            </td>
          </tr>
          <tr><td bgcolor="#c4712a" height="3" style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:20px;background-color:#faf7f2;">
              <p style="font-size:11px;color:#c0a898;margin:0;font-family:Georgia,serif;letter-spacing:0.1em;">
                © 2026 Limo's Bakery · Tanta, Egypt
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  console.log("Order notification sent");
};

const sendCancellationEmail = async (order) => {
  const customerName = order.guestInfo?.name || order.user?.name || "Guest";
  const customerEmail = order.user?.email || order.guestInfo?.email || null;

  if (!customerEmail) {
    return;
  }

  const subtotal = order.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:13px;color:#1a0f05;">
          ${item.productName}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:13px;color:#8a7060;text-align:center;">
          ${item.selectedSize}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:13px;color:#8a7060;text-align:center;">
          ×${item.quantity}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;font-size:13px;color:#1a0f05;text-align:right;">
          ${(item.price * item.quantity).toLocaleString()} EGP
        </td>
      </tr>
    `,
    )
    .join("");

  const subtotalRow = `
    <tr>
      <td colspan="3" style="padding:8px 0 4px;font-family:Georgia,serif;font-size:13px;color:#8a7060;">Subtotal</td>
      <td style="padding:8px 0 4px;font-family:Georgia,serif;font-size:13px;color:#8a7060;text-align:right;">${subtotal.toLocaleString()} EGP</td>
    </tr>
  `;

  const deliveryRow = order.deliveryRegion
    ? `
    <tr>
      <td colspan="3" style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#8a7060;">
        Delivery — ${order.deliveryRegion.name}
      </td>
      <td style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#8a7060;text-align:right;">
        ${order.deliveryRegion.price === 0 ? "Free" : `${order.deliveryRegion.price.toLocaleString()} EGP`}
      </td>
    </tr>
  `
    : "";

  const discountRow =
    order.discountCode && order.discountSavings > 0
      ? `
      <tr>
        <td colspan="3" style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#7a9a60;">
          Discount (${order.discountCode})
        </td>
        <td style="padding:4px 0;font-family:Georgia,serif;font-size:13px;color:#7a9a60;text-align:right;">
          −${order.discountSavings.toLocaleString()} EGP
        </td>
      </tr>
    `
      : "";

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: { email: process.env.EMAIL_USER, name: "Limo's Bakery" },
      to: [{ email: process.env.EMAIL_USER }],
      subject: `❌ Order Cancelled — ${customerName} · ${order.totalPrice.toLocaleString()} EGP`,
      htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body bgcolor="#faf7f2" style="margin:0;padding:0;background-color:#faf7f2;font-family:Georgia,serif;color:#1a0f05;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf7f2">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;">

          <tr><td bgcolor="#b02020" height="3" style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <tr>
            <td bgcolor="#ffffff" style="padding:36px 40px 24px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <p style="font-size:11px;letter-spacing:0.25em;color:#c4712a;margin:0 0 4px 0;">LIMO'S</p>
              <p style="font-size:24px;font-weight:900;color:#1a0f05;margin:0 0 4px 0;font-style:italic;">Order Cancelled</p>
          
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td bgcolor="#e8ddd0" height="1" style="height:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Order meta -->
          <tr>
            <td bgcolor="#ffffff" style="padding:0 40px 24px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#faf7f2;border:1px solid #e8ddd0;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="font-size:11px;letter-spacing:0.2em;color:#8a7060;margin:0 0 12px 0;">ORDER DETAILS</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;width:110px;">Order ID</td>
                        <td style="font-size:12px;color:#1a0f05;font-weight:600;padding:4px 0;font-family:monospace;">
                          #${order._id.toString().slice(-6).toUpperCase()}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Date</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">
                          ${new Date(order.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Address</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">${order.deliveryAddress}</td>
                      </tr>
                      ${
                        order.deliveryRegion
                          ? `
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Region</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;">${order.deliveryRegion.name}</td>
                      </tr>`
                          : ""
                      }
                      <tr>
                        <td style="font-size:13px;color:#8a7060;padding:4px 0;">Payment</td>
                        <td style="font-size:13px;color:#1a0f05;font-weight:600;padding:4px 0;text-transform:capitalize;">${order.paymentMethod}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td bgcolor="#ffffff" style="padding:0 40px 24px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <p style="font-size:11px;letter-spacing:0.2em;color:#8a7060;margin:0 0 12px 0;">CANCELLED ITEMS</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <th style="font-size:11px;color:#8a7060;text-align:left;padding-bottom:8px;font-weight:500;">Item</th>
                  <th style="font-size:11px;color:#8a7060;text-align:center;padding-bottom:8px;font-weight:500;">Size</th>
                  <th style="font-size:11px;color:#8a7060;text-align:center;padding-bottom:8px;font-weight:500;">Qty</th>
                  <th style="font-size:11px;color:#8a7060;text-align:right;padding-bottom:8px;font-weight:500;">Price</th>
                </tr>
                ${itemsRows}
                ${subtotalRow}
                ${deliveryRow}
                ${discountRow}
                <tr>
                  <td colspan="3" style="padding:12px 0 0;border-top:1px solid #e8ddd0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#1a0f05;">
                    Order Total
                  </td>
                  <td style="padding:12px 0 0;border-top:1px solid #e8ddd0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#b02020;text-align:right;">
                    ${order.totalPrice.toLocaleString()} EGP
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td bgcolor="#ffffff" style="padding:0 40px 32px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td bgcolor="#e8ddd0" height="1" style="height:1px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
          
            </td>
          </tr>

          <tr><td bgcolor="#b02020" height="3" style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:20px;background-color:#faf7f2;">
              <p style="font-size:11px;color:#c0a898;margin:0;font-family:Georgia,serif;letter-spacing:0.1em;">
                © 2026 Limo's Bakery · Tanta, Egypt
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  console.log("Cancellation email sent to", customerEmail);
};

module.exports = {
  sendVerificationEmail,
  sendOrderNotification,
  sendCancellationEmail,
};
