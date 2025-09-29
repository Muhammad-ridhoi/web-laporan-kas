// === APLIKASI LAPORAN KAS DIGITAL - FINAL FIXED VERSION ===
document.addEventListener("DOMContentLoaded", async () => {
  // --- Konfigurasi Firebase ---
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
    console.log("✅ Firebase berhasil diinisialisasi!");

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
    const refreshButton = document.getElementById("refresh-button");

    // 🆕 VARIABEL GLOBAL
    let currentFilter = "all";
    let allTransactions = [];

    // --- Helper Functions ---
    const formatRupiah = (angka) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(angka);

    // 🔥 FUNGSI NORMALISASI TANGGAL (SUPER IMPORTANT!)
    const normalizeDate = (dateString) => {
      // Input: "2025-09-28" atau "28/09/2025"
      // Output: Date object dengan waktu 00:00:00

      let year, month, day;

      if (dateString.includes("-")) {
        // Format: YYYY-MM-DD
        [year, month, day] = dateString.split("-").map(Number);
      } else if (dateString.includes("/")) {
        // Format: DD/MM/YYYY
        [day, month, year] = dateString.split("/").map(Number);
      } else {
        console.error("Format tanggal tidak dikenali:", dateString);
        return null;
      }

      // Buat date object (month - 1 karena JS month start dari 0)
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      return date;
    };

    // 🔥 FUNGSI CEK PERIODE - LOGIKA BARU YANG LEBIH SIMPLE!
    const isInPeriod = (tanggalStr, period) => {
      const transaksiDate = normalizeDate(tanggalStr);

      if (!transaksiDate || isNaN(transaksiDate.getTime())) {
        console.warn("⚠️ Tanggal invalid:", tanggalStr);
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (period) {
        case "all":
          return true;

        case "week": {
          // 🔥 LOGIKA BARU: Lebih sederhana dan akurat!
          const dayOfWeek = today.getDay(); // 0=Minggu, 1=Senin, dst

          // Hitung jarak ke Senin minggu ini
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

          // Senin minggu ini (awal minggu)
          const monday = new Date(today);
          monday.setDate(today.getDate() - daysToMonday);
          monday.setHours(0, 0, 0, 0);

          // Minggu minggu ini (akhir minggu)
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          // Debug log
          console.log("📅 Range Minggu Ini:", {
            senin: monday.toISOString().split("T")[0],
            minggu: sunday.toISOString().split("T")[0],
            transaksi: tanggalStr,
            result: transaksiDate >= monday && transaksiDate <= sunday,
          });

          return transaksiDate >= monday && transaksiDate <= sunday;
        }

        case "month": {
          // Bulan ini: tanggal 1 sampai akhir bulan
          const year = today.getFullYear();
          const month = today.getMonth();

          const firstDay = new Date(year, month, 1);
          firstDay.setHours(0, 0, 0, 0);

          const lastDay = new Date(year, month + 1, 0); // 0 = hari terakhir bulan sebelumnya
          lastDay.setHours(23, 59, 59, 999);

          return transaksiDate >= firstDay && transaksiDate <= lastDay;
        }

        case "year": {
          // Tahun ini: 1 Jan sampai 31 Des
          const year = today.getFullYear();

          const firstDay = new Date(year, 0, 1);
          firstDay.setHours(0, 0, 0, 0);

          const lastDay = new Date(year, 11, 31);
          lastDay.setHours(23, 59, 59, 999);

          return transaksiDate >= firstDay && transaksiDate <= lastDay;
        }

        default:
          return true;
      }
    };

    // 🆕 GET PERIOD LABEL
    const getPeriodLabel = (period) => {
      const today = new Date();

      switch (period) {
        case "all":
          return "Semua transaksi";

        case "week": {
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

          const monday = new Date(today);
          monday.setDate(today.getDate() - daysToMonday);

          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          const monthName = monday.toLocaleDateString("id-ID", {
            month: "short",
          });
          return `Minggu ini (${monday.getDate()}-${sunday.getDate()} ${monthName})`;
        }

        case "month":
          return today.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          });

        case "year":
          return `Tahun ${today.getFullYear()}`;

        default:
          return "Semua transaksi";
      }
    };

    // 🆕 RENDER TABLE
    const renderTable = (transactions, filter) => {
      console.log(`\n🔄 RENDER TABLE - Filter: ${filter}`);
      console.log(`📦 Total data: ${transactions.length}`);

      let totalPemasukan = 0;
      let totalPengeluaran = 0;
      let rowsHtml = "";

      // Filter transaksi
      const filteredTransactions = transactions.filter((t) => {
        const pass = isInPeriod(t.tanggal, filter);
        console.log(`  ${t.tanggal} (${t.jenis}): ${pass ? "✅" : "❌"}`);
        return pass;
      });

      console.log(
        `✅ Hasil filter: ${filteredTransactions.length} transaksi\n`
      );

      // Build table rows
      filteredTransactions.forEach((data) => {
        if (data.jenis === "pemasukan") totalPemasukan += data.jumlah;
        else totalPengeluaran += data.jumlah;

        const warna =
          data.jenis === "pemasukan" ? "text-success" : "text-danger";
        const tanda = data.jenis === "pemasukan" ? "+" : "-";
        const icon =
          data.jenis === "pemasukan"
            ? '<i class="bi bi-arrow-down-circle-fill me-1"></i>'
            : '<i class="bi bi-arrow-up-circle-fill me-1"></i>';

        rowsHtml += `<tr>
          <td><small class="text-muted">${data.tanggal}</small></td>
          <td>${data.keterangan}</td>
          <td class="text-end fw-bold ${warna}">
            ${icon}${tanda} ${formatRupiah(data.jumlah)
          .replace("Rp", "")
          .trim()}
          </td>
        </tr>`;
      });

      // Update UI
      riwayatTabelBody.innerHTML =
        rowsHtml ||
        `
        <tr><td colspan="3" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-3 d-block mb-2"></i>
          <p class="mb-0">Tidak ada transaksi untuk periode ini</p>
          <small>Coba ganti filter atau tambah transaksi baru</small>
        </td></tr>
      `;

      const saldoAkhir = totalPemasukan - totalPengeluaran;
      const periodLabel = getPeriodLabel(filter);

      document.getElementById("totalPemasukan").textContent =
        formatRupiah(totalPemasukan);
      document.getElementById("totalPengeluaran").textContent =
        formatRupiah(totalPengeluaran);
      document.getElementById("saldoAkhir").textContent =
        formatRupiah(saldoAkhir);
      document.getElementById("label-pemasukan").textContent = periodLabel;
      document.getElementById("label-pengeluaran").textContent = periodLabel;
      document.getElementById("label-saldo").textContent = periodLabel;

      console.log(
        `💰 Total: Pemasukan=${formatRupiah(
          totalPemasukan
        )}, Pengeluaran=${formatRupiah(totalPengeluaran)}`
      );
    };

    // --- LOAD DATA FROM FIREBASE ---
    async function tampilkanData(userId) {
      if (!userId) return;

      riwayatTabelBody.innerHTML = `<tr><td colspan="3" class="text-center">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        Memuat data...
      </td></tr>`;

      try {
        const q = query(
          collection(db, "transaksi"),
          where("userId", "==", userId),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);

        allTransactions = [];
        querySnapshot.forEach((doc) => {
          allTransactions.push(doc.data());
        });

        console.log(`\n✅ DATA LOADED`);
        console.log(`📊 Total: ${allTransactions.length} transaksi`);
        allTransactions.forEach((t, i) => {
          console.log(
            `  ${i + 1}. ${t.tanggal} | ${t.jenis} | ${formatRupiah(
              t.jumlah
            )} | ${t.keterangan}`
          );
        });

        renderTable(allTransactions, currentFilter);
      } catch (error) {
        console.error("❌ Error load data:", error);
        riwayatTabelBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Gagal memuat: ${error.message}
        </td></tr>`;
      }
    }

    // --- EVENT LISTENERS ---

    // Filter buttons
    document.querySelectorAll(".filter-buttons .btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".filter-buttons .btn").forEach((b) => {
          b.classList.remove("btn-primary", "active");
          b.classList.add("btn-outline-primary");
        });
        this.classList.remove("btn-outline-primary");
        this.classList.add("btn-primary", "active");

        currentFilter = this.dataset.filter;
        console.log(`\n🔘 Filter: ${currentFilter}`);
        renderTable(allTransactions, currentFilter);
        document.querySelector(".table-responsive").scrollTop = 0;
      });
    });

    // Refresh button
    refreshButton.addEventListener("click", () => {
      const user = auth.currentUser;
      if (user) {
        refreshButton.innerHTML =
          '<i class="bi bi-arrow-clockwise me-1"></i>Memuat...';
        refreshButton.disabled = true;
        tampilkanData(user.uid).finally(() => {
          refreshButton.innerHTML =
            '<i class="bi bi-arrow-clockwise me-1"></i>Refresh';
          refreshButton.disabled = false;
        });
      }
    });

    // Auth state
    onAuthStateChanged(auth, (user) => {
      if (user) {
        authContainer.classList.add("d-none");
        appContainer.classList.remove("d-none");
        userEmailSpan.textContent = user.email;

        const today = new Date().toISOString().split("T")[0];
        document.getElementById("tanggal").value = today;

        console.log(`\n👤 Login: ${user.email}`);
        console.log(`📅 Hari ini: ${today}`);

        tampilkanData(user.uid);
      } else {
        appContainer.classList.add("d-none");
        authContainer.classList.remove("d-none");
      }
    });

    // Form submit
    kasForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Anda harus login.");

      const submitBtn = kasForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
      submitBtn.disabled = true;

      const dataTransaksi = {
        tanggal: document.getElementById("tanggal").value,
        keterangan: document.getElementById("keterangan").value,
        jenis: document.getElementById("jenis").value,
        jumlah: parseInt(jumlahInput.value.replace(/\./g, "")),
        userId: user.uid,
        timestamp: serverTimestamp(),
      };

      console.log(`\n💾 SIMPAN:`, dataTransaksi);

      try {
        await addDoc(collection(db, "transaksi"), dataTransaksi);
        kasForm.reset();
        document.getElementById("tanggal").value = new Date()
          .toISOString()
          .split("T")[0];

        await tampilkanData(user.uid);

        const alert = document.createElement("div");
        alert.className =
          "alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3";
        alert.style.zIndex = "9999";
        alert.innerHTML = `
          <i class="bi bi-check-circle me-2"></i>
          Transaksi berhasil disimpan!
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
      } catch (error) {
        console.error("❌ Error simpan:", error);
        alert("Gagal menyimpan: " + error.message);
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });

    // Currency format
    jumlahInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/[^0-9]/g, "");
      e.target.value = value
        ? new Intl.NumberFormat("id-ID").format(value)
        : "";
    });

    // Toggle login/register
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

    // Logout
    logoutButton.addEventListener("click", async () => {
      if (confirm("Yakin ingin logout?")) {
        try {
          await signOut(auth);
          currentFilter = "all";
          allTransactions = [];
        } catch (error) {
          alert("Gagal logout: " + error.message);
        }
      }
    });

    // Login
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Login...';
      submitBtn.disabled = true;

      try {
        await signInWithEmailAndPassword(
          auth,
          loginForm["login-email"].value,
          loginForm["login-password"].value
        );
        loginForm.reset();
      } catch (error) {
        let msg = "Login gagal!";
        if (error.code === "auth/user-not-found")
          msg = "Email tidak terdaftar!";
        else if (error.code === "auth/wrong-password") msg = "Password salah!";
        alert(msg);
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });

    // Register
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Mendaftar...';
      submitBtn.disabled = true;

      try {
        await createUserWithEmailAndPassword(
          auth,
          registerForm["register-email"].value,
          registerForm["register-password"].value
        );
        registerForm.reset();
        alert("🎉 Pendaftaran berhasil! Silakan login.");
        showLoginLink.click();
      } catch (error) {
        let msg = "Pendaftaran gagal!";
        if (error.code === "auth/email-already-in-use")
          msg = "Email sudah terdaftar!";
        else if (error.code === "auth/weak-password")
          msg = "Password terlalu lemah!";
        alert(msg);
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey) {
        const btns = document.querySelectorAll(".filter-buttons .btn");
        if (e.key === "1") {
          e.preventDefault();
          btns[0].click();
        } else if (e.key === "2") {
          e.preventDefault();
          btns[1].click();
        } else if (e.key === "3") {
          e.preventDefault();
          btns[2].click();
        } else if (e.key === "4") {
          e.preventDefault();
          btns[3].click();
        }
      }
    });

    console.log("\n🚀 APP READY!");
    console.log("💡 Alt+1/2/3/4 untuk quick filter\n");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    document.body.innerHTML = `
      <div class="container mt-5">
        <div class="alert alert-danger">
          <h4><i class="bi bi-exclamation-triangle me-2"></i>Error Kritis</h4>
          <p>Gagal memuat aplikasi.</p>
        </div>
      </div>
    `;
  }
});
