using DatabaseConn;
using MySql.Data.MySqlClient;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var db = new DatabaseConnector();

app.MapGet("/api/health", () =>
{
    try
    {
        using var conn = db.GetConnection();
        return Results.Ok(new { status = "Healthy", message = "Connected to mysql" });
    }
    catch (Exception ex)
    {
        return Results.Problem($"db connect failed: {ex.Message}");
    }
});

app.MapGet("/api/users", () =>
{
    var users = new List<object>();
    using var conn = db.GetConnection();
    using var cmd = new MySqlCommand("SELECT id, email, first_name, last_name, is_verified FROM users", conn);
    using var reader = cmd.ExecuteReader();

    while (reader.Read())
    {
        users.Add(new
        {
            Id = reader.GetInt32("id"),
            Email = reader.GetString("email"),
            FirstName = reader.IsDBNull(reader.GetOrdinal("first_name")) ? null : reader.GetString("first_name"),
            LastName = reader.IsDBNull(reader.GetOrdinal("last_name")) ? null : reader.GetString("last_name"),
            IsVerified = reader.GetBoolean("is_verified")
        });
    }
    return Results.Ok(users);
});

app.MapGet("/api/users/{id:int}", (int id) =>
{
    using var conn = db.GetConnection();
    using var cmd = new MySqlCommand("SELECT id, email, first_name, last_name, is_verified FROM users WHERE id = @Id", conn);
    cmd.Parameters.AddWithValue("@Id", id);
    using var reader = cmd.ExecuteReader();

    if (reader.Read())
    {
        return Results.Ok(new
        {
            Id = reader.GetInt32("id"),
            Email = reader.GetString("email"),
            FirstName = reader.IsDBNull(reader.GetOrdinal("first_name")) ? null : reader.GetString("first_name"),
            LastName = reader.IsDBNull(reader.GetOrdinal("last_name")) ? null : reader.GetString("last_name"),
            IsVerified = reader.GetBoolean("is_verified")
        });
    }
    return Results.NotFound(new { message = $"User with ID {id} not found." });
});

app.MapPost("/api/users", (UserDto userDto) =>
{
    using var conn = db.GetConnection();
    string query = "INSERT INTO users (email, password_hash, first_name, last_name) VALUES (@Email, @PasswordHash, @FirstName, @LastName)";
    
    using var cmd = new MySqlCommand(query, conn);
    cmd.Parameters.AddWithValue("@Email", userDto.Email);
    cmd.Parameters.AddWithValue("@PasswordHash", userDto.PasswordHash);
    cmd.Parameters.AddWithValue("@FirstName", userDto.FirstName);
    cmd.Parameters.AddWithValue("@LastName", userDto.LastName);

    cmd.ExecuteNonQuery();
    return Results.Created($"/api/users", new { message = "User created", email = userDto.Email });
});

app.MapPut("/api/users/{id:int}", (int id, UpdateUserDto updateDto) =>
{
    using var conn = db.GetConnection();
    string query = "UPDATE users SET first_name = @FirstName, last_name = @LastName WHERE id = @Id";
    
    using var cmd = new MySqlCommand(query, conn);
    cmd.Parameters.AddWithValue("@Id", id);
    cmd.Parameters.AddWithValue("@FirstName", updateDto.FirstName);
    cmd.Parameters.AddWithValue("@LastName", updateDto.LastName);

    int rowsAffected = cmd.ExecuteNonQuery();
    if (rowsAffected == 0) return Results.NotFound(new { message = "User not found." });

    return Results.Ok(new { message = "User updated" });
});

app.MapDelete("/api/users/{id:int}", (int id) =>
{
    using var conn = db.GetConnection();
    using var cmd = new MySqlCommand("DELETE FROM users WHERE id = @Id", conn);
    cmd.Parameters.AddWithValue("@Id", id);

    int rowsAffected = cmd.ExecuteNonQuery();
    if (rowsAffected == 0) return Results.NotFound(new { message = "User not found." });

    return Results.Ok(new { message = "User delete" });
});


app.MapGet("/api/games", () =>
{
    var games = new List<object>();
    using var conn = db.GetConnection();
    using var cmd = new MySqlCommand("SELECT id, title, genre, price FROM games", conn);
    using var reader = cmd.ExecuteReader();

    while (reader.Read())
    {
        games.Add(new
        {
            Id = reader.GetInt32("id"),
            Title = reader.GetString("title"),
            Genre = reader.IsDBNull(reader.GetOrdinal("genre")) ? null : reader.GetString("genre"),
            Price = reader.GetDecimal("price")
        });
    }
    return Results.Ok(games);
});

app.MapGet("/api/users/{userId:int}/games", (int userId) =>
{
    var userGames = new List<object>();
    using var conn = db.GetConnection();
    
    string query = @"
        SELECT g.id, g.title, g.genre, g.price, ug.purchased_at 
        FROM games g
        INNER JOIN user_games ug ON g.id = ug.game_id
        WHERE ug.user_id = @UserId";

    using var cmd = new MySqlCommand(query, conn);
    cmd.Parameters.AddWithValue("@UserId", userId);
    using var reader = cmd.ExecuteReader();

    while (reader.Read())
    {
        userGames.Add(new
        {
            Id = reader.GetInt32("id"),
            Title = reader.GetString("title"),
            Genre = reader.IsDBNull(reader.GetOrdinal("genre")) ? null : reader.GetString("genre"),
            Price = reader.GetDecimal("price"),
            PurchasedAt = reader.GetDateTime("purchased_at")
        });
    }
    
    return Results.Ok(userGames);
});

app.Run();

// DTO
public record UserDto(string Email, string PasswordHash, string FirstName, string LastName);
public record UpdateUserDto(string FirstName, string LastName);
