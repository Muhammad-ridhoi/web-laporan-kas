// === BAGIAN 1: FUNGSI UTAMA APLIKASI ===
// Seluruh logika aplikasi dibungkus di sini agar berjalan setelah halaman siap
document.addEventListener("DOMContentLoaded", async () => {
  // --- Konfigurasi Firebase ---
  // 🚨 PENTING: PASTIKAN KONFIGURASI INI BENAR SESUAI PROYEK ANDA 🚨
  const firebaseConfig = {
    apiKey: "AIzaSyALI5jHJ3d34O5OG6PIjI_N39kQdmRJOFQ",
    authDomain: "backend-laporan-kas.firebaseapp.com",
    projectId: "backend-laporan-kas",
    storageBucket: "backend-laporan-kas.firebasestorage.app",
    messagingSenderId: "656197087271",
    appId: "1:656197087271:web:4760b8fdd12abc48f61e02",
  };

  try {
    // --- Import & Inisialisasi Firebase ---
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js"
    );
    const {
      getAuth,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
    } = await import(
      "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js"
    );
    const {
      getFirestore,
      collection,
      addDoc,
      query,
      where,
      getDocs,
      orderBy,
      serverTimestamp,
    } = await import(
      "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js"
    );

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log("✅ Firebase & Firestore berhasil diinisialisasi!");

    // --- Pemilih Elemen (DOM Selectors) ---
    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");
    const logoutButton = document.getElementById("logout-button");
    const userEmailSpan = document.getElementById("user-email");
    const kasForm = document.getElementById("kasForm");
    const jumlahInput = document.getElementById("jumlah");
    const riwayatTabelBody = document.getElementById("riwayatTabelBody");

    // --- Fungsi Bantuan (Helpers) ---
    const formatRupiah = (angka) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(angka);

    // --- Fungsi Manajemen Data ---
    async function tampilkanData(userId) {
      if (!userId) return;
      riwayatTabelBody.innerHTML = `<tr><td colspan="3" class="text-center">Memuat data...</td></tr>`;
      try {
        const q = query(
          collection(db, "transaksi"),
          where("userId", "==", userId),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        let totalPemasukan = 0,
          totalPengeluaran = 0;
        let rowsHtml = "";
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.jenis === "pemasukan") totalPemasukan += data.jumlah;
          else totalPengeluaran += data.jumlah;

          const jumlahKelasWarna =
            data.jenis === "pemasukan" ? "text-success" : "text-danger";
          const tanda = data.jenis === "pemasukan" ? "+" : "-";
          rowsHtml += `<tr><td>${data.tanggal}</td><td>${
            data.keterangan
          }</td><td class="text-end fw-bold ${jumlahKelasWarna}">${tanda} ${formatRupiah(
            data.jumlah
          )
            .replace("Rp", "")
            .trim()}</td></tr>`;
        });
        riwayatTabelBody.innerHTML =
          rowsHtml ||
          `<tr><td colspan="3" class="text-center">Belum ada transaksi.</td></tr>`;

        const saldoAkhir = totalPemasukan - totalPengeluaran;
        document.getElementById("totalPemasukan").textContent =
          formatRupiah(totalPemasukan);
        document.getElementById("totalPengeluaran").textContent =
          formatRupiah(totalPengeluaran);
        document.getElementById("saldoAkhir").textContent =
          formatRupiah(saldoAkhir);
      } catch (error) {
        console.error("Error mengambil data:", error);
        riwayatTabelBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Gagal memuat data.</td></tr>`;
      }
    }

    // --- Logika Autentikasi & Event Listeners ---
    onAuthStateChanged(auth, (user) => {
      if (user) {
        authContainer.classList.add("d-none");
        appContainer.classList.remove("d-none");
        userEmailSpan.textContent = user.email;
        tampilkanData(user.uid);
      } else {
        appContainer.classList.add("d-none");
        authContainer.classList.remove("d-none");
      }
    });

    kasForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Anda harus login.");

      const jumlahValue = jumlahInput.value.replace(/\./g, "");
      const dataTransaksi = {
        tanggal: document.getElementById("tanggal").value,
        keterangan: document.getElementById("keterangan").value,
        jenis: document.getElementById("jenis").value,
        jumlah: parseInt(jumlahValue),
        userId: user.uid,
        timestamp: serverTimestamp(),
      };

      try {
        await addDoc(collection(db, "transaksi"), dataTransaksi);
        kasForm.reset();
        tampilkanData(user.uid);
      } catch (error) {
        console.error("Error menambah dokumen: ", error);
        alert("Gagal menyimpan data.");
      }
    });

    jumlahInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/[^0-9]/g, "");
      e.target.value = value
        ? new Intl.NumberFormat("id-ID").format(value)
        : "";
    });

    showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      loginView.classList.add("d-none");
      registerView.classList.remove("d-none");
    });
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      registerView.classList.add("d-none");
      loginView.classList.remove("d-none");
    });
    logoutButton.addEventListener("click", () => signOut(auth));

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      signInWithEmailAndPassword(
        auth,
        loginForm["login-email"].value,
        loginForm["login-password"].value
      ).catch((error) => alert(`Login Gagal: ${error.message}`));
    });

    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      createUserWithEmailAndPassword(
        auth,
        registerForm["register-email"].value,
        registerForm["register-password"].value
      )
        .then(() => {
          registerForm.reset();
          alert("Pendaftaran berhasil! Silakan login.");
          showLoginLink.click();
        })
        .catch((error) => alert(`Daftar Gagal: ${error.message}`));
    });
  } catch (error) {
    console.error("❌ Gagal total saat inisialisasi Firebase:", error);
    document.body.innerHTML = `<div class="alert alert-danger m-5"><h4>Error Kritis</h4><p>Gagal memuat Firebase. Pastikan konfigurasi Anda benar dan periksa koneksi internet. Cek console (F12) untuk detail.</p></div>`;
  }
});
