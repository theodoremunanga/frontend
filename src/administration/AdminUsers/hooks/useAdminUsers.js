import { useMemo, useState, useEffect } from "react";

export default function useAdminUsers(users = []) {
    // ======================================================
    // USER SELECTED
    // ======================================================

    const [selectedUser, setSelectedUser] = useState(null);

    // ======================================================
    // FILTERS
    // ======================================================

    const [filters, setFilters] = useState({
        search: "",
        country: "ALL",
        role: "ALL",
        status: "ALL",
        sort: "username",
    });

    // ======================================================
    // UPDATE FILTER
    // ======================================================

    const updateFilter = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // ======================================================
    // FILTERED USERS
    // ======================================================

    const filteredUsers = useMemo(() => {
        let data = [...users];

        // SEARCH
        if (filters.search.trim()) {
            const q = filters.search.toLowerCase();

            data = data.filter((u) => {
                return (
                    String(u.username || "")
                        .toLowerCase()
                        .includes(q) ||

                    String(u.phone || "")
                        .toLowerCase()
                        .includes(q) ||

                    String(u.custom_id || "")
                        .toLowerCase()
                        .includes(q)
                );
            });
        }

        // ROLE
        if (filters.role !== "ALL") {
            data = data.filter(
                (u) =>
                    String(u.role).toUpperCase() ===
                    filters.role
            );
        }

        // COUNTRY
        if (filters.country !== "ALL") {
            data = data.filter(
                (u) =>
                    String(u.country || "").toUpperCase() ===
                    filters.country
            );
        }

        // STATUS
        if (filters.status === "ACTIVE") {
            data = data.filter((u) => !u.is_suspended);
        }

        if (filters.status === "SUSPENDED") {
            data = data.filter((u) => u.is_suspended);
        }

        // SORT
        switch (filters.sort) {
            case "balance":
                data.sort(
                    (a, b) =>
                        Number(b.balance || 0) -
                        Number(a.balance || 0)
                );
                break;

            case "activity":
                data.sort(
                    (a, b) =>
                        Number(b.games_played || 0) -
                        Number(a.games_played || 0)
                );
                break;

            case "lastLogin":
                data.sort(
                    (a, b) =>
                        new Date(b.last_login || 0) -
                        new Date(a.last_login || 0)
                );
                break;

            default:
                data.sort((a, b) =>
                    String(a.username || "").localeCompare(
                        String(b.username || "")
                    )
                );
        }

        return data;
    }, [users, filters]);

    // ======================================================
    // AUTO SELECT FIRST USER
    // ======================================================

    useMemo(() => {
        if (
            filteredUsers.length &&
            !selectedUser
        ) {
            setSelectedUser(filteredUsers[0]);
        }
    }, [filteredUsers, selectedUser]);

    useEffect(() => {
        if (filteredUsers.length && !selectedUser) {
            setSelectedUser(filteredUsers[0]);
        }
    }, [filteredUsers, selectedUser]);

    // ======================================================
    // STATS
    // ======================================================

    const stats = useMemo(() => {
        return {
            total: users.length,

            connected: users.filter(
                (u) => u.is_online
            ).length,

            suspended: users.filter(
                (u) => u.is_suspended
            ).length,

            admins: users.filter(
                (u) => u.role === "ADMIN"
            ).length,

            jo: users.filter(
                (u) => u.role === "JO"
            ).length,

            totalBalance: users.reduce(
                (sum, u) =>
                    sum + Number(u.balance || 0),
                0
            ),
        };
    }, [users]);

    // ======================================================
    // COUNTRIES
    // ======================================================

    const countries = useMemo(() => {
        return [
            "ALL",
            ...new Set(
                users
                    .map((u) => u.country)
                    .filter(Boolean)
            ),
        ];
    }, [users]);

    // ======================================================
    // RETURN
    // ======================================================

    return {
        filters,
        updateFilter,

        filteredUsers,

        selectedUser,
        setSelectedUser,

        stats,

        countries,
    };
}