const API_BASE = "http://localhost:5050"; // backend URL

// 🧾 Fetch fee table from MongoDB
document.getElementById("fetchFeesBtn").addEventListener("click", async () => {
  const res = await fetch(`${API_BASE}/api/fees`);
  const data = await res.json();
  if (data.success) renderTable(data.data, "Fee Transactions (On Blockchain + MongoDB)");
});

// 💰 Add new fee
document.getElementById("feeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const studentId = document.getElementById("studentId").value;
  const amount = document.getElementById("amount").value;

  const res = await fetch(`${API_BASE}/api/pay-fee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, amount }),
  });

  const data = await res.json();
  document.getElementById("feeResult").innerHTML = data.success
    ? `<p style="color:green">✅ Transaction Successful!<br>Hash: ${data.txnHash}</p>`
    : `<p style="color:red">❌ ${data.error}</p>`;
});

// 📦 Upload CSV
document.getElementById("uploadCsvBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("csvFile");
  if (!fileInput.files[0]) return alert("Select a CSV file first!");

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  const res = await fetch(`${API_BASE}/api/import-csv`, { method: "POST", body: formData });
  const data = await res.json();
  alert(data.message || "Import complete!");
});

// 📊 Create new table
document.getElementById("createTableBtn").addEventListener("click", async () => {
  const name = prompt("Enter new table name:");
  if (!name) return;
  const res = await fetch(`${API_BASE}/api/create-table`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  alert(data.message);
});

// 🔗 Fetch blockchain data
document.getElementById("fetchBlocksBtn").addEventListener("click", async () => {
  const res = await fetch(`${API_BASE}/api/blockchain-data`);
  const data = await res.json();
  if (data.success) renderTable(data.data, "Blockchain Blocks (Ganache)");
});

// Utility: render table
function renderTable(rows, title) {
  let html = `<h3>${title}</h3><table><tr>`;
  if (!rows.length) return (document.getElementById("databaseTables").innerHTML = "<p>No data found</p>");
  const keys = Object.keys(rows[0]);
  keys.forEach((k) => (html += `<th>${k}</th>`));
  html += "</tr>";
  rows.forEach((r) => {
    html += "<tr>";
    keys.forEach((k) => (html += `<td>${r[k]}</td>`));
    html += "</tr>";
  });
  html += "</table>";
  document.getElementById("databaseTables").innerHTML = html;
}
