// Firebase Configuration & Profile Management
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBeet8eefoHisNGuHheICPm0HfJpGCjY60",
    authDomain: "break-atlas.firebaseapp.com",
    projectId: "break-atlas",
    storageBucket: "break-atlas.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export for use in other modules
export { auth, db, provider, addDoc, collection, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc };

// Global State
window.currentUser = null;
window.isPickingLocation = false;
window.tempMarker = null;

// --- AUTHENTICATION ---
window.triggerGoogleLogin = () => {
    console.log("🔐 Initiating Google Sign-In...");
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("✅ Logged in successfully:", user.displayName);
            console.log("User UID:", user.uid);
            console.log("User Email:", user.email);
            document.getElementById('authModal').classList.remove('active');
        }).catch((error) => {
            console.error("❌ Login Error:", error);
            console.error("Error Code:", error.code);
            console.error("Error Message:", error.message);

            // Provide user-friendly error messages
            let userMessage = "Login failed: " + error.message;

            if (error.code === 'auth/unauthorized-domain') {
                userMessage = `❌ Domain not authorized!\n\nThe domain '${window.location.origin}' is not authorized for OAuth.\n\nFix:\n1. Go to Firebase Console → Authentication → Settings\n2. Add '${window.location.hostname}' to Authorized domains\n3. Also add to Google Cloud Console OAuth settings`;
                console.error("🔧 FIX: Add this domain to Firebase authorized domains:", window.location.hostname);
            } else if (error.code === 'auth/popup-blocked') {
                userMessage = "❌ Pop-up blocked! Please allow pop-ups for this site and try again.";
            } else if (error.code === 'auth/popup-closed-by-user') {
                userMessage = "Login cancelled - you closed the pop-up.";
            } else if (error.code === 'auth/network-request-failed') {
                userMessage = "❌ Network error! Check your internet connection.";
            }

            alert(userMessage);

            // Log helpful debugging info
            console.log("📋 Debug Info:");
            console.log("- Current URL:", window.location.href);
            console.log("- Origin:", window.location.origin);
            console.log("- Hostname:", window.location.hostname);
            console.log("\n💡 Quick Fixes:");
            console.log("1. Add '" + window.location.hostname + "' to Firebase authorized domains");
            console.log("2. Add '" + window.location.origin + "' to Google Cloud OAuth settings");
            console.log("3. Check Firebase Console: https://console.firebase.google.com/project/break-atlas-app/authentication/settings");
        });
};

window.triggerLogout = () => {
    signOut(auth).then(() => {
        console.log("Logged out");
        alert("Signed out successfully.");
    });
};

// Listen for auth changes
onAuthStateChanged(auth, (user) => {
    window.currentUser = user;
    updateUIForUser(user);
    if (user) {
        loadProfileData(user);
    } else {
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            profileContent.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <span class="material-icons-round" style="font-size:3rem; color:var(--text-sub);">account_circle</span>
                    <h3>Guest User</h3>
                    <p>Please log in to view your profile.</p>
                    <button class="btn-primary" onclick="toggleAuth()" style="margin-top:20px;">Log In</button>
                </div>
            `;
        }
    }
});

function updateUIForUser(user) {
    const statusEl = document.getElementById('userStatus');
    if (user) {
        statusEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${user.photoURL}" style="width:30px; height:30px; border-radius:50%;">
                <div style="flex:1; overflow:hidden; text-overflow:ellipsis;">${user.displayName}</div>
            </div>
            <button onclick="triggerLogout()" style="margin-top:10px; background:rgba(255,255,255,0.1); border:none; color:var(--text); padding:5px 10px; border-radius:5px; cursor:pointer; width:100%;">Log Out</button>
        `;
    } else {
        statusEl.innerHTML = `
            <div style="margin-bottom:10px;">Not logged in</div>
            <button class="btn-primary" onclick="toggleAuth()" style="width:100%; padding:8px;">Log In</button>
        `;
    }
}

// --- ENHANCED PROFILE MANAGEMENT ---
async function loadProfileData(user) {
    const profileContent = document.getElementById('profile-content');
    if (!profileContent) return;

    // Try to fetch extended profile from Firestore
    const profileDoc = await getDoc(doc(db, "users", user.uid));
    const profileData = profileDoc.exists() ? profileDoc.data() : {};

    const bio = profileData.bio || "No bio yet. Click edit to add one!";
    const city = profileData.city || "";
    const country = profileData.country || "";
    const location = (city && country) ? `${city}, ${country}` : "Not specified";
    const breakingStyle = profileData.breakingStyle || "Not specified";
    const experience = profileData.yearsExperience || 0;

    // Get social links
    const instagram = profileData.socialLinks?.instagram || "";
    const youtube = profileData.socialLinks?.youtube || "";
    const tiktok = profileData.socialLinks?.tiktok || "";

    // Get stats
    const stats = profileData.stats || {};
    const spotsCreated = stats.spotsCreated || 0;
    const favoritesCount = stats.favoritesCount || 0;
    const followersCount = stats.followersCount || 0;

    // Build social links HTML
    let socialLinksHTML = '';
    if (instagram || youtube || tiktok) {
        socialLinksHTML = '<div style="margin-top:15px; display:flex; justify-content:center; gap:10px;">';
        if (instagram) socialLinksHTML += `<a href="https://instagram.com/${instagram}" target="_blank" style="color:var(--primary);">IG</a>`;
        if (youtube) socialLinksHTML += `<a href="${youtube}" target="_blank" style="color:var(--primary);">YT</a>`;
        if (tiktok) socialLinksHTML += `<a href="https://tiktok.com/@${tiktok}" target="_blank" style="color:var(--primary);">TT</a>`;
        socialLinksHTML += '</div>';
    }

    profileContent.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <img src="${user.photoURL}" style="width:100px; height:100px; border-radius:50%; margin-bottom:15px; border:3px solid var(--primary);">
            <h2 style="margin-bottom:5px;">${user.displayName}</h2>
            <p style="color:var(--text-sub); margin-bottom:5px;">${location}</p>
            <p style="color:var(--text-sub); font-size:0.9rem; font-style:italic; max-width:400px; margin:10px auto;">"${bio}"</p>
            ${socialLinksHTML}
            
            <button onclick="openEditProfile()" class="btn-primary" style="width:auto; padding:10px 30px; margin-top:20px;">
                <span class="material-icons-round" style="vertical-align:middle; font-size:1rem;">edit</span> Edit Profile
            </button>

            <div style="margin-top:30px; display:flex; justify-content:center; gap:15px; flex-wrap:wrap;">
                <div class="card" style="padding:15px 25px; text-align:center; min-width:80px;">
                    <div style="font-size:1.5rem; font-weight:700; color:var(--primary);">${spotsCreated}</div>
                    <div style="font-size:0.8rem; color:var(--text-sub); margin-top:5px;">Spots</div>
                </div>
                <div class="card" style="padding:15px 25px; text-align:center; min-width:80px;">
                    <div style="font-size:1.5rem; font-weight:700; color:var(--primary);">${favoritesCount}</div>
                    <div style="font-size:0.8rem; color:var(--text-sub); margin-top:5px;">Favorites</div>
                </div>
                <div class="card" style="padding:15px 25px; text-align:center; min-width:80px;">
                    <div style="font-size:1.5rem; font-weight:700; color:var(--primary);">${followersCount}</div>
                    <div style="font-size:0.8rem; color:var(--text-sub); margin-top:5px;">Followers</div>
                </div>
            </div>

            <div style="margin-top:30px; padding:20px; background:var(--card-bg); border-radius:12px; text-align:left;">
                <h3 style="font-size:1rem; margin-bottom:15px;">About</h3>
                <div style="display:grid; grid-template-columns: 120px 1fr; gap:10px; font-size:0.9rem;">
                    <div style="color:var(--text-sub);">Style:</div>
                    <div style="color:var(--text);">${breakingStyle}</div>
                    
                    <div style="color:var(--text-sub);">Experience:</div>
                    <div style="color:var(--text);">${experience} years</div>
                </div>
            </div>
        </div>
    `;
}

// Open edit profile modal and populate form
window.openEditProfile = async function () {
    if (!window.currentUser) return;

    const profileDoc = await getDoc(doc(db, "users", window.currentUser.uid));
    const profileData = profileDoc.exists() ? profileDoc.data() : {};

    // Populate form
    document.getElementById('editDisplayName').value = window.currentUser.displayName || "";
    document.getElementById('editBio').value = profileData.bio || "";
    document.getElementById('editCity').value = profileData.city || "";
    document.getElementById('editCountry').value = profileData.country || "";
    document.getElementById('editBreakingStyle').value = profileData.breakingStyle || "";
    document.getElementById('editExperience').value = profileData.yearsExperience || "";
    document.getElementById('editInstagram').value = profileData.socialLinks?.instagram || "";
    document.getElementById('editYoutube').value = profileData.socialLinks?.youtube || "";
    document.getElementById('editTiktok').value = profileData.socialLinks?.tiktok || "";
    document.getElementById('editVisibility').value = profileData.settings?.profileVisibility || "public";

    // Open modal
    document.getElementById('editProfileModal').classList.add('active');
}

// Save profile data
window.saveProfile = async function (e) {
    e.preventDefault();
    if (!window.currentUser) return;

    const profileData = {
        uid: window.currentUser.uid,
        email: window.currentUser.email,
        displayName: document.getElementById('editDisplayName').value,
        photoURL: window.currentUser.photoURL,
        bio: document.getElementById('editBio').value,
        city: document.getElementById('editCity').value,
        country: document.getElementById('editCountry').value,
        breakingStyle: document.getElementById('editBreakingStyle').value,
        yearsExperience: parseInt(document.getElementById('editExperience').value) || 0,
        socialLinks: {
            instagram: document.getElementById('editInstagram').value,
            youtube: document.getElementById('editYoutube').value,
            tiktok: document.getElementById('editTiktok').value
        },
        settings: {
            profileVisibility: document.getElementById('editVisibility').value,
            showEmail: false,
            allowMessages: true
        },
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "users", window.currentUser.uid), profileData, { merge: true });
        alert("Profile updated successfully!");
        document.getElementById('editProfileModal').classList.remove('active');

        // Reload profile
        loadProfileData(window.currentUser);
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile: " + error.message);
    }
}
