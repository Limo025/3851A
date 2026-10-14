import '../css/styles/admin-user-list.css';

export default function AdminUserList({
  users,
  selectedId,
  loading,
  page,
  pages,
  search,
  searchInput,
  onSearchInput,
  onSearch,
  onSelect,
  onPageChange,
}) {
  return (
    <section aria-label="Users">
      <h2>Users</h2>
      <form className="admin-page__search" role="search" onSubmit={onSearch}>
        <input
          type="search"
          aria-label="Search users by name or email"
          placeholder="Search name or email"
          maxLength={100}
          value={searchInput}
          onChange={(event) => onSearchInput(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {loading ? <p>Loading users…</p> : users.length === 0 ? (
        <p>{search ? 'No users match your search.' : 'No users found.'}</p>
      ) : (
        <ul className="admin-page__list">
          {users.map((user) => (
            <li key={user._id}>
              <button
                type="button"
                className={selectedId === user._id ? 'admin-page__selected' : ''}
                onClick={() => onSelect(user)}
              >
                <strong>{user.username || 'Unnamed user'}</strong>
                <span>{user.email}</span>
                <small>{user.isBanned ? 'Banned' : 'Active'} · Joined {new Date(user.createdAt).toLocaleDateString()}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="admin-page__pagination">
        <button disabled={page === 1 || loading} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages || loading} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </section>
  );
}
