using MySql.Data.MySqlClient;

namespace DatabaseConn;

public class DatabaseConnector 
{
    private readonly string _connectionString = "Server=localhost;Port=3306;Database=test_db;Uid=user;Pwd=pass123;AllowPublicKeyRetrieval=True;sslmode=0;"; 

    public MySqlConnection GetConnection() 
    {
        MySqlConnection connection = new MySqlConnection(_connectionString);
        connection.Open();
        return connection;
    }
}
