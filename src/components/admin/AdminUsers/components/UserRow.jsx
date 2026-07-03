import {
    userRow,
    userRowActive,
    folder,
    userName,
    userSmall,
    COLORS,
} from "../styles";

function roleColor(role) {
    switch (role) {
        case "ADMIN":
            return COLORS.admin;

        case "JO":
            return COLORS.jo;

        default:
            return COLORS.user;
    }
}

export default function UserRow({
    user,
    selected,
    onClick,
}) {

    const online = Boolean(
        user.is_online
    );

    return (
        <div
            style={
                selected
                    ? userRowActive
                    : userRow
            }
            onClick={() => onClick(user)}
            onMouseEnter={(e) => {
                if (!selected) {
                    e.currentTarget.style.background =
                        "rgba(37,99,235,.18)";
                }
            }}
            onMouseLeave={(e) => {
                if (!selected) {
                    e.currentTarget.style.background =
                        "transparent";
                }
            }}
        >
            {/* Icône dossier */}

            <div style={folder}>
                📁
            </div>

            {/* Informations */}

            <div
                style={{
                    flex: 1,
                }}
            >
                <div style={userName}>
                    {user.username}
                </div>

                <div style={userSmall}>
                    ID {user.custom_id || user.id}
                </div>
            </div>

            {/* Etat connecté */}

            <div
                style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    marginRight: 12,
                    background: online
                        ? COLORS.success
                        : COLORS.suspended,
                    boxShadow: online
                        ? "0 0 8px #22c55e"
                        : "none",
                }}
            />

            {/* Badge rôle */}

            <div
                style={{
                    background: roleColor(
                        user.role
                    ),
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: 30,
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 60,
                    textAlign: "center",
                }}
            >
                {user.role}
            </div>
        </div>
    );
}