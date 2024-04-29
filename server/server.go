package main

import (
    "fmt"
    "net/http"
    "io"
    "os"
)

func hello(w http.ResponseWriter, req *http.Request) {
    fmt.Fprintf(w, "hello\n")
}

func headers(w http.ResponseWriter, req *http.Request) {
    //go func(req *http.Request) {
        io.Copy(os.Stdout, req.Body)
    //}(req)
    for name, headers := range req.Header {
        for _, h := range headers {
            fmt.Printf("%v: %v\n", name, h)
        }
    }
}

func main() {
    http.HandleFunc("/hello", hello)
    http.HandleFunc("/headers", headers)

    http.ListenAndServe(":10000", nil)
}
