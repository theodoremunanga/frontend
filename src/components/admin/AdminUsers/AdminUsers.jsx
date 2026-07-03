import { useState } from "react";

import api from "../../../services/api";

import useAdminUsers from "./hooks/useAdminUsers";

import {
    page,
    layout,
} from "./styles";

import AdminHeader from "./components/AdminHeader";
import UserSidebar from "./components/UserSidebar";
import UserDetails from "./components/UserDetails";
import ActionModal from "./components/ActionModal";

export default function AdminUsers({

    users = [],

    refresh,

}) {

    const {

        filters,

        updateFilter,

        filteredUsers,

        selectedUser,

        setSelectedUser,

        stats,

        countries,

    } = useAdminUsers(users);

    const [

        modalOpen,

        setModalOpen,

    ] = useState(false);

    const [

        currentAction,

        setCurrentAction,

    ] = useState(null);

    const [

        loading,

        setLoading,

    ] = useState(false);

    //----------------------------------------------------

    const openAction = (

        action,

        user

    ) => {

        setCurrentAction(action);

        setSelectedUser(user);

        setModalOpen(true);

    };

    //----------------------------------------------------

    const closeAction = () => {

        setModalOpen(false);

        setCurrentAction(null);

    };

    //----------------------------------------------------

    async function validateAction(

        action,

        user,

        form

    ) {

        try {

            setLoading(true);

            switch (action) {

                case "credit":

                    await api.post(
                        "/admin/users/fund",
                        {
                            userId: user.id,
                            amount: Number(form.amount),
                            reason: form.reason,
                        }
                    );

                    break;

                case "debit":

                    await api.post(
                        "/admin/users/debit",
                        {
                            userId: user.id,
                            amount: Number(form.amount),
                            reason: form.reason,
                        }
                    );

                    break;

                case "freeze":

                    await api.post(
                        "/admin/users/freeze-funds",
                        {
                            userId: user.id,
                            amount: Number(form.amount),
                            freeze: true,
                            reason: form.reason,
                        }
                    );

                    break;

                case "unfreeze":

                    await api.post(
                        "/admin/users/freeze-funds",
                        {
                            userId: user.id,
                            amount: Number(form.amount),
                            freeze: false,
                            reason: form.reason,
                        }
                    );

                    break;

                case "suspend":

                    await api.post(
                        "/admin/users/suspend",
                        {
                            userId: user.id,
                            value: true,
                            reason: form.reason,
                        }
                    );

                    break;

                case "activate":

                    await api.post(
                        "/admin/users/suspend",
                        {
                            userId: user.id,
                            value: false,
                        }
                    );

                    break;

                case "notification":

                    await api.post(
                        "/admin/users/message",
                        {
                            userId: user.id,
                            message: form.message,
                        }
                    );

                    break;

                case "role":

                    await api.post(
                        "/admin/users/change-role",
                        {
                            userId: user.id,
                            role: form.role,
                        }
                    );

                    break;

                case "delete":

                    await api.delete(
                        `/admin/users/${user.id}`
                    );

                    break;

                case "history":

                    console.log(
                        "Historique complet"
                    );

                    break;

                case "pdf":

                    console.log(
                        "Exporter PDF"
                    );

                    break;

                case "excel":

                    console.log(
                        "Exporter Excel"
                    );

                    break;

                default:

                    break;

            }

            await refresh?.();

            closeAction();

        }

        catch (err) {

            console.error(err);

        }

        finally {

            setLoading(false);

        }

    }

    //----------------------------------------------------

    return (

        <div style={page}>

            <AdminHeader

                stats={stats}

            />

            <div style={layout}>

                <UserSidebar

                    users={filteredUsers}

                    selectedUser={selectedUser}

                    setSelectedUser={setSelectedUser}

                    filters={filters}

                    updateFilter={updateFilter}

                    countries={countries}

                />

                <UserDetails

                    user={selectedUser}

                    onAction={openAction}

                />

            </div>

            <ActionModal

                open={modalOpen}

                action={currentAction}

                user={selectedUser}

                loading={loading}

                onClose={closeAction}

                onValidate={validateAction}

            />

        </div>

    );

}