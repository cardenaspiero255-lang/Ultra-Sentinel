package androidx.datastore.core.handlers

class ReplaceFileCorruptionHandler<T>(val produceNewData: suspend (Throwable) -> T)
