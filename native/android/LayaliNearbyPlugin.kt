package com.layalialward.app

import android.Manifest
import android.os.Build
import android.view.WindowManager
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import java.nio.charset.StandardCharsets

/**
 * LayaliNearbyPlugin — Capacitor 8 native plugin wrapping Google Nearby Connections
 * (Bluetooth + Wi-Fi Direct) with Strategy.P2P_POINT_TO_POINT, explicit 4-digit auth confirmation,
 * and FLAG_SECURE support for the privacy curtain.
 *
 * Register in MainActivity.kt:
 *   registerPlugin(LayaliNearbyPlugin::class.java)
 *
 * Gradle dependency (android/app/build.gradle):
 *   implementation "com.google.android.gms:play-services-nearby:19.3.0"
 */
@CapacitorPlugin(
    name = "LayaliNearby",
    permissions = [
        Permission(strings = [Manifest.permission.ACCESS_FINE_LOCATION], alias = "location"),
        Permission(
            strings = [
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            ],
            alias = "bluetooth"
        ),
        Permission(strings = [Manifest.permission.NEARBY_WIFI_DEVICES], alias = "nearbyWifi")
    ]
)
class LayaliNearbyPlugin : Plugin() {
    companion object {
        private const val MAX_NEARBY_BYTES = 32_768
        private const val DEFAULT_SERVICE_ID = "com.layalialward.nearby.v1"
        private const val MAX_LABEL_LEN = 24
    }

    private val connectionsClient: ConnectionsClient by lazy {
        Nearby.getConnectionsClient(context)
    }

    private var localEndpointLabel: String = "LayaliDevice"
    private var localRole: String = "wife"
    private var connectedEndpointId: String? = null
    private val pendingInitiatedEndpoints = mutableSetOf<String>()

    private fun requiredAliases(): Array<String> {
        return when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                arrayOf("bluetooth", "nearbyWifi", "location")
            }
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                arrayOf("bluetooth", "location")
            }
            else -> {
                arrayOf("location")
            }
        }
    }

    private fun hasAllRequiredPermissions(): Boolean {
        return requiredAliases().all { alias ->
            getPermissionState(alias) == PermissionState.GRANTED
        }
    }

    private fun sanitizeLabel(raw: String?): String {
        val cleaned = raw
            ?.replace("|", " ")
            ?.replace(Regex("[\\p{Cntrl}]"), "")
            ?.trim()
            ?.take(MAX_LABEL_LEN)
        return if (cleaned.isNullOrEmpty()) "LayaliDevice" else cleaned
    }

    private fun parseEndpointIdentity(endpointName: String): Pair<String?, String> {
        val parts = endpointName.split("|", limit = 2)
        val peerRole = if (parts.size == 2 && (parts[0] == "wife" || parts[0] == "husband")) parts[0] else null
        val peerLabel = sanitizeLabel(if (parts.size == 2) parts[1] else endpointName)
        return Pair(peerRole, peerLabel)
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (connectedEndpointId != endpointId) return
            val bytes = payload.asBytes() ?: return
            if (bytes.size > MAX_NEARBY_BYTES) return
            val jsonString = String(bytes, StandardCharsets.UTF_8)
            val data = JSObject().apply {
                put("endpointId", endpointId)
                put("data", jsonString)
            }
            notifyListeners("onPayloadReceived", data)
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            // Byte payloads arrive atomically in onPayloadReceived
        }
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            if (connectedEndpointId != null && connectedEndpointId != endpointId) {
                connectionsClient.rejectConnection(endpointId)
                return
            }
            pendingInitiatedEndpoints.add(endpointId)
            val (peerRole, peerLabel) = parseEndpointIdentity(info.endpointName)
            val data = JSObject().apply {
                put("endpointId", endpointId)
                put("label", peerLabel)
                put("authDigits", info.authenticationDigits)
                if (peerRole != null) {
                    put("role", peerRole)
                }
            }
            notifyListeners("onConnectionRequested", data)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            pendingInitiatedEndpoints.remove(endpointId)
            when (result.status.statusCode) {
                ConnectionsStatusCodes.STATUS_OK -> {
                    connectedEndpointId = endpointId
                    connectionsClient.stopAdvertising()
                    connectionsClient.stopDiscovery()
                    val data = JSObject().apply {
                        put("endpointId", endpointId)
                    }
                    notifyListeners("onConnected", data)
                }
                ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED,
                ConnectionsStatusCodes.STATUS_ERROR -> {
                    if (connectedEndpointId == endpointId) {
                        connectedEndpointId = null
                    }
                    val data = JSObject().apply {
                        put("endpointId", endpointId)
                    }
                    notifyListeners("onDisconnected", data)
                }
            }
        }

        override fun onDisconnected(endpointId: String) {
            pendingInitiatedEndpoints.remove(endpointId)
            if (connectedEndpointId == endpointId) {
                connectedEndpointId = null
            }
            val data = JSObject().apply {
                put("endpointId", endpointId)
            }
            notifyListeners("onDisconnected", data)
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            val (peerRole, peerLabel) = parseEndpointIdentity(info.endpointName)
            val data = JSObject().apply {
                put("endpointId", endpointId)
                put("label", peerLabel)
                if (peerRole != null) {
                    put("role", peerRole)
                }
            }
            notifyListeners("onPeerFound", data)
        }

        override fun onEndpointLost(endpointId: String) {
            val data = JSObject().apply {
                put("endpointId", endpointId)
            }
            notifyListeners("onPeerLost", data)
        }
    }

    @PluginMethod
    fun startAdvertising(call: PluginCall) {
        localEndpointLabel = sanitizeLabel(call.getString("deviceName"))
        val rawRole = call.getString("role")
        localRole = if (rawRole == "husband" || rawRole == "wife") rawRole else "wife"
        val serviceId = call.getString("serviceId")?.takeIf { it.isNotBlank() } ?: DEFAULT_SERVICE_ID

        if (!hasAllRequiredPermissions()) {
            requestPermissionAliases(requiredAliases(), call, "permissionsCallback")
            return
        }

        val advertisedName = "$localRole|$localEndpointLabel"
        val options = AdvertisingOptions.Builder()
            .setStrategy(Strategy.P2P_POINT_TO_POINT)
            .build()

        connectionsClient.startAdvertising(advertisedName, serviceId, connectionLifecycleCallback, options)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { err -> call.reject("Failed to start advertising", err) }
    }

    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        val serviceId = call.getString("serviceId")?.takeIf { it.isNotBlank() } ?: DEFAULT_SERVICE_ID
        if (!hasAllRequiredPermissions()) {
            requestPermissionAliases(requiredAliases(), call, "permissionsCallback")
            return
        }

        val options = DiscoveryOptions.Builder()
            .setStrategy(Strategy.P2P_POINT_TO_POINT)
            .build()

        connectionsClient.startDiscovery(serviceId, endpointDiscoveryCallback, options)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { err -> call.reject("Failed to start discovery", err) }
    }

    @PermissionCallback
    private fun permissionsCallback(call: PluginCall) {
        if (hasAllRequiredPermissions()) {
            when (call.methodName) {
                "startAdvertising" -> startAdvertising(call)
                "startDiscovery" -> startDiscovery(call)
                else -> call.resolve()
            }
        } else {
            call.reject("Bluetooth and Nearby Wi-Fi permissions are required for offline pairing.")
        }
    }

    @PluginMethod
    fun connectToPeer(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) {
            call.reject("endpointId is required")
            return
        }
        if (connectedEndpointId != null) {
            call.reject("Already connected to a peer")
            return
        }
        val advertisedName = "$localRole|$localEndpointLabel"
        connectionsClient.requestConnection(advertisedName, endpointId, connectionLifecycleCallback)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { err -> call.reject("Failed to connect to peer", err) }
    }

    @PluginMethod
    fun acceptConnection(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) {
            call.reject("endpointId is required")
            return
        }
        if (connectedEndpointId != null) {
            call.reject("Already connected to a peer")
            return
        }
        if (!pendingInitiatedEndpoints.contains(endpointId)) {
            call.reject("Unknown or uninitiated endpoint")
            return
        }
        connectionsClient.acceptConnection(endpointId, payloadCallback)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { err -> call.reject("Failed to accept connection", err) }
    }

    @PluginMethod
    fun rejectConnection(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) {
            call.reject("endpointId is required")
            return
        }
        pendingInitiatedEndpoints.remove(endpointId)
        connectionsClient.rejectConnection(endpointId)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { err -> call.reject("Failed to reject connection", err) }
    }

    @PluginMethod
    fun sendPayload(call: PluginCall) {
        val targetId = call.getString("endpointId") ?: connectedEndpointId
        val data = call.getString("data")
        if (targetId.isNullOrBlank() || data == null) {
            call.reject("No active nearby connection or empty payload")
            return
        }
        if (connectedEndpointId != targetId) {
            call.reject("Target endpoint is not currently connected")
            return
        }
        val bytes = data.toByteArray(StandardCharsets.UTF_8)
        if (bytes.size > MAX_NEARBY_BYTES) {
            call.reject("Payload exceeds Nearby Connections 32KB limit")
            return
        }
        val payload = Payload.fromBytes(bytes)
        connectionsClient.sendPayload(targetId, payload)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { err -> call.reject("Failed to send payload", err) }
    }

    @PluginMethod
    fun setPrivacyScreenEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        val currentActivity = activity
        if (currentActivity == null) {
            call.resolve()
            return
        }
        currentActivity.runOnUiThread {
            if (enabled) {
                currentActivity.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
            } else {
                currentActivity.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
            call.resolve()
        }
    }

    @PluginMethod
    fun stopAll(call: PluginCall) {
        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
        pendingInitiatedEndpoints.clear()
        connectedEndpointId = null
        call.resolve()
    }

    override fun handleOnDestroy() {
        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
        pendingInitiatedEndpoints.clear()
        connectedEndpointId = null
        super.handleOnDestroy()
    }
}
