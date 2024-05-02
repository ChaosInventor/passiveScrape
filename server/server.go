package main

import (
    "net/http"
    "io"
    "os"
    "log"
    "encoding/base64"
    "database/sql"
    "strings"
    _ "github.com/lib/pq"
)

func save(_ http.ResponseWriter, req *http.Request, db *sql.DB) error {
    bytes, err := io.ReadAll(req.Body)
    if err != nil {
        return err
    }

    bs := new(strings.Builder)
    be := base64.NewEncoder(base64.StdEncoding, bs)
    be.Write(bytes)
    be.Close()

    if _, err := db.Exec("INSERT INTO dom (url, data) VALUES ($1, decode($2, 'base64'));", req.PathValue("name"), bs.String()); err != nil {
        return err
    }

    return nil

}

func connectDB() (*sql.DB, error) {
    dbURL, dbURLSet := os.LookupEnv("DBURL")
    if !dbURLSet {
        dbURL = "sslmode=disable dbname=passiveScrapes"
    }

    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        return nil, err
    }

    if err := db.Ping(); err != nil {
        return nil, err
    }

    return db, nil

}

func main() {
    db, err := connectDB()
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    http.HandleFunc("POST /save/{name...}",
    func(w http.ResponseWriter, req *http.Request) {
        if err := save(w, req, db); err != nil {
            http.Error(w, err.Error(), 500)
            log.Print(err)
        }
    })

    log.Print("Ready to serve")
    log.Fatal(http.ListenAndServe(":10000", nil))
}
