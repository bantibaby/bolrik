
    document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    const closeMenu = document.getElementById("close-menu");
    const links = document.querySelectorAll(".user-top-links");
    
        // ... अन्य मौजूदा कोड ...
        
        // एक्टिव लिंक को हाइलाइट करें
        function setActiveLink() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.user-top-links');
            
            navLinks.forEach(link => {
                // पहले एक्टिव क्लास हटाएं
                link.classList.remove('active-link');
                
                // लिंक का पाथ निकालें
                const linkPath = link.getAttribute('href');
                
                // अगर लिंक वर्तमान पेज का है, तो एक्टिव क्लास जोड़ें
                if (linkPath === currentPath || 
                    (currentPath === '/' && linkPath === '/') ||
                    (currentPath !== '/' && linkPath !== '/' && currentPath.includes(linkPath))) {
                    link.classList.add('active-link');
                }
            });
        }
        
        // पेज लोड होने पर एक्टिव लिंक सेट करें
        setActiveLink();
        
        // अगर SPA (Single Page Application) है, तो राउट बदलने पर भी अपडेट करें
    
    // मेनू ओपन/क्लोज़ फंक्शन
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.add('show');
            body.classList.add('menu-open');
        });
    }
    
    if (closeMenu) {
        closeMenu.addEventListener('click', function() {
            navLinks.classList.add('closing');
            setTimeout(() => {
                navLinks.classList.remove('show');
                navLinks.classList.remove('closing');
                body.classList.remove('menu-open');
            }, 500);
        });
    }
    
    // स्क्रीन रीसाइज़ होने पर मेनू रीसेट करें
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // डेस्कटॉप व्यू में रीसेट करें
            navLinks.classList.remove('show');
            navLinks.classList.remove('closing');
            body.classList.remove('menu-open');
            
            // सभी स्टाइल वापस सेट करें
            navLinks.style.left = '';
            navLinks.style.opacity = '';
            navLinks.style.transform = '';
            navLinks.style.animation = '';
            
            // कोई इनलाइन स्टाइल हो तो हटा दें
            const menuItems = document.querySelectorAll('.user-top-links');
            menuItems.forEach(item => {
                item.style = '';
            });
        }
    });
    
    // पेज लोड होते समय भी चेक करें कि क्या स्क्रीन साइज डेस्कटॉप है
    if (window.innerWidth > 768) {
        navLinks.classList.remove('show');
        body.classList.remove('menu-open');
    }

    document.addEventListener("DOMContentLoaded", function () {
        const timerElement = document.getElementById("topBar"); // Timer ka main div
        const timerPera = document.querySelector(".timerPera"); // Timer text
        const navBar = document.querySelector(".navBar");
    
        // ✅ Ek naya div create karein jo sticky timer ke liye hoga
        const stickyTimer = document.createElement("div");
        stickyTimer.classList.add("sticky-timer");
        stickyTimer.innerHTML = timerPera.innerHTML; // TimerPera ka content copy kar le
        document.body.appendChild(stickyTimer); // ✅ Isse body me add kar dein
    
        window.addEventListener("scroll", function () {
            const timerPosition = timerElement.getBoundingClientRect().top; // Timer ka position le lo
            const navHeight = navBar.offsetHeight; // Navbar ki height lo
    
            if (timerPosition < navHeight) { 
                stickyTimer.classList.add("timer-fixed"); // ✅ Navbar ke neeche stick ho jayega
            } else {
                stickyTimer.classList.remove("timer-fixed"); // ✅ Wapas normal ho jayega
            }
        });
    });
    // Open Menu with Smooth Transition
    menuToggle.addEventListener("click", function () {
        navLinks.classList.add("show");
        navLinks.style.transform = "translateX(0%)";
        menuToggle.style.display ="none";
    });

    // Close Menu on Click
    closeMenu.addEventListener("click", function () {
        navLinks.style.transform = "translateX(-100%)";
        setTimeout(() => navLinks.classList.remove("show"), 300);
        menuToggle.style.display ="block";

    });

    // Close Menu When Clicking Outside (Mobile Only)
    // document.addEventListener("click", function (event) {
    //     if (!navLinks.contains(event.target) && !menuToggle.contains(event.target)) {
    //         navLinks.style.transform = "translateX(-100%)";
    //         setTimeout(() => navLinks.classList.remove("show"), 300);
    //     }
    // });

    // Active Link Highlight
    links.forEach(link => {
        if (window.location.pathname === link.getAttribute("href")) {
            link.classList.add("active-link");
        }
    });
    
});

