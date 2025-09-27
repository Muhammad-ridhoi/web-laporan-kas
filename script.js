document.addEventListener("DOMContentLoaded", function () {
  // GANTI DENGAN URL WEB APP ANDA YANG SEBENARNYA
  const backendUrl =
    "https://script.google.com/macros/s/AKfycbyfHR-HVmSAavzmpkE3ZHeUNCvkDXsyg3BEMmepocWsSToc1yZhdrMfFuGHtgXzwrkgrQ/exec";

  // === BAGIAN 1: FUNGSI UNTUK MENGAMBIL DAN MENAMPILKAN DATA DASHBOARD ===
  function fetchDashboardData() {
    fetch(backendUrl) // Secara default, fetch melakukan method GET
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "sukses") {
          // Hitung total
          let totalPemasukan = 0;
          let totalPengeluaran = 0;

          data.data.forEach((transaksi) => {
            if (transaksi.jenis === "pemasukan") {
              totalPemasukan += transaksi.jumlah;
            } else if (transaksi.jenis === "pengeluaran") {
              totalPengeluaran += transaksi.jumlah;
            }
          });

          const saldoAkhir = totalPemasukan - totalPengeluaran;

          // Format angka ke Rupiah
          const formatRupiah = (angka) =>
            new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(angka);

          // Tampilkan di kartu dashboard
          document.getElementById("totalPemasukan").textContent =
            formatRupiah(totalPemasukan);
          document.getElementById("totalPengeluaran").textContent =
            formatRupiah(totalPengeluaran);
          document.getElementById("saldoAkhir").textContent =
            formatRupiah(saldoAkhir);
        } else {
          throw new Error(data.message);
        }
      })
      .catch((error) => {
        console.error("Gagal mengambil data dashboard:", error);
        document.getElementById("totalPemasukan").textContent = "Error";
        document.getElementById("totalPengeluaran").textContent = "Error";
        document.getElementById("saldoAkhir").textContent = "Error";
      });
  }

  // Panggil fungsi untuk pertama kali saat halaman dimuat
  fetchDashboardData();

  // === BAGIAN 2: LOGIKA PENGIRIMAN FORMULIR ===
  const kasForm = document.getElementById("kasForm");
  const submitButton = kasForm.querySelector('button[type="submit"]');
  const jumlahInput = document.getElementById("jumlah");

  jumlahInput.addEventListener("input", function (e) {
    let value = e.target.value;
    let numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue === "") {
      e.target.value = "";
      return;
    }
    const formattedValue = new Intl.NumberFormat("id-ID").format(numericValue);
    e.target.value = formattedValue;
  });

  kasForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const jumlahValue = document
      .getElementById("jumlah")
      .value.replace(/\./g, "");
    const formData = {
      tanggal: document.getElementById("tanggal").value,
      keterangan: document.getElementById("keterangan").value,
      jenis: document.getElementById("jenis").value,
      jumlah: parseInt(jumlahValue),
    };
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...`;

    fetch(backendUrl, {
      method: "POST",
      body: JSON.stringify(formData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "sukses") {
          alert("Laporan berhasil disimpan!");
          kasForm.reset();
          fetchDashboardData(); // Muat ulang data dashboard setelah transaksi baru berhasil
        } else {
          throw new Error(data.message);
        }
      })
      .catch((error) => {
        console.error("Terjadi error:", error);
        alert(`Gagal menyimpan laporan. Error: ${error.message}`);
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.innerHTML = "Simpan Laporan";
      });
  });
});
