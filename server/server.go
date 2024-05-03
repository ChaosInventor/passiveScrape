package main

import (
    "fmt"
    "net/http"
    "io"
    "os"
    "log"
    "encoding/base64"
    "encoding/json"
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

func getTracked(w http.ResponseWriter, _ *http.Request, db *sql.DB) error {
    rs, err := db.Query("SELECT (url) FROM trackingInterval WHERE until IS NULL")
    if err != nil {
        return err;
    }
    defer rs.Close()

    var urls []string;
    var str string;
    for rs.Next() {
        if err := rs.Scan(&str); err != nil {
            return err
        }
        urls = append(urls, str);
    }
    if rs.Err() != nil {
        return rs.Err()
    }

    enc := json.NewEncoder(w)
    enc.SetEscapeHTML(false)
    if err := enc.Encode(urls); err != nil {
        return err
    }

    return nil

}

func track(w http.ResponseWriter, req *http.Request, db *sql.DB) error {
    url := req.PathValue("name")

    if _, err := db.Exec("INSERT INTO tracked (url) VALUES ($1)", url); err != nil {
        if !strings.Contains(err.Error(), "tracked_pkey") {
            return err
        }
    }

    if _, err := db.Exec("INSERT INTO trackingInterval (url) VALUES ($1)", url); err != nil {
        if strings.Contains(err.Error(), "no_overlapping_intervals") {
            http.Error(w, fmt.Sprintln("URL", url, "is being tracked"), 409)
            return nil
        } else {
            return err
        }
    }

    return nil

}
func untrack(w http.ResponseWriter, req *http.Request, db *sql.DB) error {
    url := req.PathValue("name")

    res, err := db.Exec("UPDATE trackingInterval SET until = CURRENT_TIMESTAMP WHERE url = $1 AND until IS NULL", url)
    if err != nil {
        return err
    }

    if n, err := res.RowsAffected(); err != nil {
        return err
    } else if n == 0 {
        http.Error(w, fmt.Sprintln("URL", url, "is not being tracked"), 409)
        return nil
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
    http.HandleFunc("POST /track/{name...}",
    func(w http.ResponseWriter, req *http.Request) {
        if err := track(w, req, db); err != nil {
            http.Error(w, err.Error(), 500)
            log.Print(err)
        }
    })
    http.HandleFunc("POST /untrack/{name...}",
    func(w http.ResponseWriter, req *http.Request) {
        if err := untrack(w, req, db); err != nil {
            http.Error(w, err.Error(), 500)
            log.Print(err)
        }
    })

    http.HandleFunc("GET /tracked",
    func(w http.ResponseWriter, req *http.Request) {
        if err := getTracked(w, req, db); err != nil {
            http.Error(w, err.Error(), 500)
            log.Print(err)
        }
    })

    log.Print("Ready to serve")
    log.Fatal(http.ListenAndServe(":10000", nil))
}
