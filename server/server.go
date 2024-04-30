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

func save(w http.ResponseWriter, req *http.Request, db *sql.DB) error {
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

func main() {
    dbURL, dbURLSet := os.LookupEnv("DBURL")
    if !dbURLSet {
        dbURL = "sslmode=disable dbname=passiveScrapes"
    }

    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatalln(err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        log.Fatalln(err)
    }

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
