# Internet Object vs JSON Benchmarks

Compares the data size of Internet Object vs JSON output when serialized. To execute this benchmark, run the follwing code!

```sh
$ node run.js
```

You might see an output similar to the following when you run this.

```
For 1 Record(s)
===============
IO Data: 495
IO Data with Header: 671
JSON: 887
IO is 44.19% smaller than JSON!
IO with header is 24.34% smaller than JSON!

For 100 record(s)
=================
IO Data: 50862
IO Data with Header: 51038
JSON: 89963
IO is 43.46% smaller than JSON!
IO with header is 43.27% smaller than JSON!

For 1000 record(s)
==================
IO Data: 506234
IO Data with Header: 506410
JSON: 897235
IO is 43.58% smaller than JSON!
IO with header is 43.56% smaller than JSON!
```

> **Work in Progress:** The benchmark uses the prototype structure of Internet Object. Even though the structure is not finalized, it will give you sufficient idea about how much bytes IO can save when compared with JSON. The final structure may change after the draft is finalized!

Should you have any query about this benchmark, please email it to hello@internetobject.org