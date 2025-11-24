<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  // TODO: Replace the following with your app's Firebase project configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBeet8eefoHisNGuHheICPm0HfJpGCjY60",
    authDomain: "break-atlas-app.firebaseapp.com",
    projectId: "break-atlas-app",
    storageBucket: "break-atlas-app.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  // --- REPLACING THE MOCK FUNCTIONS WITH REAL FIREBASE LOGIC ---

  // 1. Google Login Function
  window.mockLogin = async function() {
      try {
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          console.log("Logged in as:", user.displayName);
          document.getElementById('authModal').classList.remove('open');
          // Optional: Save user to your database here
      } catch (error) {
          console.error("Login failed", error);
          alert("Login error: " + error.message);
      }
  }

  // 2. Check Login State (Updates UI automatically)
  onAuthStateChanged(auth, (user) => {
      const navUserText = document.querySelector('#sideNav p'); // The "Logged in as..." text
      if (user) {
          navUserText.innerHTML = `Logged in as <b>${user.displayName}</b> <br> <button onclick="window.logout()" style="margin-top:10px; padding:5px 10px; cursor:pointer;">Logout</button>`;
      } else {
          navUserText.innerHTML = `Logged in as Guest`;
      }
  });

  window.logout = function() {
      signOut(auth).then(() => alert('Signed out!'));
  }

  // 3. Load Spots from Database (Real Backend Data)
  window.loadSpotsFromDB = async function() {
      const querySnapshot = await getDocs(collection(db, "spots"));
      let dbSpots = [];
      querySnapshot.forEach((doc) => {
          dbSpots.push(doc.data());
      });
      
      // If DB is empty, use default mock data, otherwise use DB data
      if(dbSpots.length > 0) {
          window.renderList(dbSpots);
          window.addMarkers(dbSpots);
      } else {
          // Fallback to the hardcoded 'spots' array from original code
          console.log("No spots in DB, using mock data");
          window.renderList(spots); 
          window.addMarkers(spots);
      }
  }
  
  // Call this instead of standard render
  window.loadSpotsFromDB();

</script>