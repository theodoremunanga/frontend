import {
    sidebar,
    usersList,
} from "../styles";

import Filters from "./Filters";
import UserRow from "./UserRow";

export default function UserSidebar({
    users = [],
    selectedUser,
    setSelectedUser,
    filters,
    updateFilter,
    countries,
}) {
    return (
        <div style={sidebar}>

            <Filters
                filters={filters}
                updateFilter={updateFilter}
                countries={countries}
            />

            <div style={usersList}>

                {!users.length && (
                    <div
                        style={{
                            padding: 30,
                            textAlign: "center",
                            color: "#94a3b8",
                        }}
                    >
                        Aucun utilisateur trouvé
                    </div>
                )}

                {users.map((user) => (
                    <UserRow
                        key={user.id}
                        user={user}
                        selected={
                            selectedUser?.id === user.id
                        }
                        onClick={setSelectedUser}
                    />
                ))}

            </div>

        </div>
    );
}