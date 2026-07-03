import {
    filters,
    input,
    select,
} from "../styles";

export default function Filters({
    filters: values,
    updateFilter,
    countries = [],
}) {
    return (
        <div style={filters}>

            {/* Recherche */}

            <input
                style={input}
                type="text"
                placeholder="🔎 Rechercher un utilisateur..."
                value={values.search}
                onChange={(e) =>
                    updateFilter(
                        "search",
                        e.target.value
                    )
                }
            />

            {/* Pays */}

            <select
                style={select}
                value={values.country}
                onChange={(e) =>
                    updateFilter(
                        "country",
                        e.target.value
                    )
                }
            >
                {countries.map((country) => (
                    <option
                        key={country}
                        value={country}
                    >
                        {country === "ALL"
                            ? "🌍 Tous les pays"
                            : country}
                    </option>
                ))}
            </select>

            {/* Rôle */}

            <select
                style={select}
                value={values.role}
                onChange={(e) =>
                    updateFilter(
                        "role",
                        e.target.value
                    )
                }
            >
                <option value="ALL">
                    👥 Tous les rôles
                </option>

                <option value="USER">
                    🟢 USER
                </option>

                <option value="JO">
                    🔵 JO
                </option>

                <option value="ADMIN">
                    🔴 ADMIN
                </option>
            </select>

            {/* Etat */}

            <select
                style={select}
                value={values.status}
                onChange={(e) =>
                    updateFilter(
                        "status",
                        e.target.value
                    )
                }
            >
                <option value="ALL">
                    Tous les états
                </option>

                <option value="ACTIVE">
                    🟢 Actifs
                </option>

                <option value="SUSPENDED">
                    ⚫ Suspendus
                </option>
            </select>

            {/* Tri */}

            <select
                style={select}
                value={values.sort}
                onChange={(e) =>
                    updateFilter(
                        "sort",
                        e.target.value
                    )
                }
            >
                <option value="username">
                    Trier par nom
                </option>

                <option value="balance">
                    Trier par balance
                </option>

                <option value="activity">
                    Trier par activité
                </option>

                <option value="lastLogin">
                    Trier par dernière connexion
                </option>
            </select>

        </div>
    );
}