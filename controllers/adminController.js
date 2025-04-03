exports.getAdminDashboard = (req, res) => {
    res.render("admin/dashboard", { title: "Admin Dashboard" });
};
