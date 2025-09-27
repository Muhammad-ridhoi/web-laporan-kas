document.addEventListener("DOMContentLoaded", function () {
  const kasForm = document.getElementById("kasForm");
  const submitButton = kasForm.querySelector('button[type="submit"]'); // Memilih tombol submit

  kasForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // GANTI DENGAN URL WEB APP ANDA YANG SEBENARNYA
    const backendUrl =
      "https://script.google.com/macros/s/AKfycbyfHR-HVmSAavzmpkE3ZHeUNCvkDXsyg3BEMmepocWsSToc1yZhdrMfFuGHtgXzwrkgrQ/exec";

    const formData = {
      tanggal: document.getElementById("tanggal").value,
      keterangan: document.getElementById("keterangan").value,
      jenis: document.getElementById("jenis").value,
      jumlah: parseInt(document.getElementById("jumlah").value),
    };

    // Nonaktifkan tombol dan tampilkan status "Loading"
    submitButton.disabled = true;
    submitButton.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Menyimpan...
        `;

    // Menggunakan "kurir" fetch untuk mengirim data
    fetch(backendUrl, {
      method: "POST",
      body: JSON.stringify(formData), // Mengubah objek data menjadi format teks JSON
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // Diperlukan untuk Google Apps Script
      },
    })
      .then((response) => response.json()) // Mengubah respon dari backend menjadi objek JavaScript
      .then((data) => {
        console.log("Respon dari backend:", data);
        if (data.status === "sukses") {
          alert("Laporan berhasil disimpan di Google Sheets!");
          kasForm.reset(); // Mengosongkan form jika sukses
        } else {
          throw new Error(data.message); // Jika backend melaporkan gagal, lempar error
        }
      })
      .catch((error) => {
        // Menangkap error jika terjadi masalah koneksi atau masalah dari backend
        console.error("Terjadi error:", error);
        alert(`Gagal menyimpan laporan. Error: ${error.message}`);
      })
      .finally(() => {
        // Bagian ini akan selalu dijalankan, baik sukses maupun gagal
        // Mengembalikan tombol ke kondisi semula
        submitButton.disabled = false;
        submitButton.innerHTML = "Simpan Laporan";
      });
  });
});
