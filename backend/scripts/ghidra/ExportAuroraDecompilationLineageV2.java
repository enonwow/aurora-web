// Exports one Ghidra decompilation session into the Aurora lineage v2 evidence shape.
// @category Aurora

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.framework.Application;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.util.exception.CancelledException;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

public class ExportAuroraDecompilationLineageV2 extends GhidraScript {
    private static final String ATTESTATION_VERSION =
        "aurora-ghidra-decompilation-session-attestation/v1";
    private static final String FAILURE_LEDGER_VERSION =
        "aurora-ghidra-decompilation-failure-ledger/v1";
    private static final int DEFAULT_TIMEOUT_SECONDS = 120;

    @Override
    protected void run() throws Exception {
        if (currentProgram == null) {
            throw new IllegalStateException("lineage_no_current_program");
        }

        Map<String, String> arguments = parseArguments(getScriptArgs());
        Path packetRoot = requirePacketRoot(requireArgument(arguments, "packet-root"));
        String sessionId = requireArgument(arguments, "session-id");
        validateSessionId(sessionId);
        Path inputBinary = requireRegularInput(
            packetRoot,
            requireArgument(arguments, "input-binary"),
            "lineage_input_binary_invalid"
        );
        Path toolDistribution = requireRegularInput(
            packetRoot,
            requireArgument(arguments, "tool-distribution"),
            "lineage_tool_distribution_invalid"
        );
        Path projectSnapshot = requireRegularInput(
            packetRoot,
            requireArgument(arguments, "project-snapshot"),
            "lineage_project_snapshot_invalid"
        );
        Path analyzerConfig = requireRegularInput(
            packetRoot,
            requireArgument(arguments, "analyzer-config"),
            "lineage_analyzer_config_invalid"
        );
        Path invocationLog = requireRegularInput(
            packetRoot,
            requireArgument(arguments, "invocation-log"),
            "lineage_invocation_log_invalid"
        );
        Path exporterScript = requireRegularInput(
            packetRoot,
            requireArgument(arguments, "exporter-script"),
            "lineage_exporter_script_invalid"
        );
        String projectId = requireArgument(arguments, "project-id");
        String relocationPolicy = requireArgument(arguments, "relocation-policy");
        int timeoutSeconds = parsePositiveInt(
            arguments.getOrDefault("timeout-seconds", Integer.toString(DEFAULT_TIMEOUT_SECONDS)),
            "timeout-seconds"
        );

        Path runningScript = getSourceFile().getFile(false).toPath().toAbsolutePath().normalize();
        requireRegularFile(runningScript, "lineage_running_exporter_script_invalid");
        if (!sha256(runningScript).equals(sha256(exporterScript))) {
            throw new IllegalArgumentException("lineage_exporter_script_hash_mismatch");
        }

        Map<String, Object> peIdentity = parsePortableExecutable(inputBinary);
        validateProgramIdentity(inputBinary, peIdentity);
        int addressWidth = "PE32".equals(peIdentity.get("format")) ? 8 : 16;
        Set<String> targetAddresses = parseTargetAddresses(
            decodeTargetAddresses(arguments),
            addressWidth
        );

        Path generation = requireOutputDirectory(packetRoot, packetRoot.resolve("generation"));
        Path export = requireOutputDirectory(packetRoot, packetRoot.resolve("export"));
        requireEmptyDirectory(export, "lineage_export_directory_not_empty");
        Path functionRecordsPath = generation.resolve("function-records.jsonl");
        Path failureLedgerPath = generation.resolve("failure-ledger.json");
        Path callGraphPath = generation.resolve("call-graph.jsonl");
        Path attestationPath = generation.resolve("session-attestation.json");
        requireOutputsAbsent(
            functionRecordsPath,
            failureLedgerPath,
            callGraphPath,
            attestationPath
        );

        List<Function> functions = discoverFunctions();
        List<Map<String, Object>> records = new ArrayList<>();
        List<Map<String, Object>> failures = new ArrayList<>();
        List<Function> recordedFunctions = new ArrayList<>(functions);
        Map<String, String> functionIdsByAddress = new LinkedHashMap<>();
        List<Map<String, String>> exportOutputs = new ArrayList<>();
        boolean interrupted = false;

        Set<String> discoveredAddresses = new TreeSet<>();
        for (Function function : functions) {
            String address = formatAddress(function.getEntryPoint().getOffset(), addressWidth);
            String name = sanitizeFunctionName(function.getName());
            functionIdsByAddress.put(function.getEntryPoint().toString(), address + ":" + name);
            discoveredAddresses.add(address);
        }
        for (String targetAddress : targetAddresses) {
            if (!discoveredAddresses.contains(targetAddress)) {
                throw new IllegalArgumentException(
                    "lineage_target_address_not_discovered:" + targetAddress
                );
            }
        }

        DecompInterface decompiler = new DecompInterface();
        boolean decompilerReady = false;
        try {
            decompilerReady = decompiler.openProgram(currentProgram);
            for (Function function : functions) {
                try {
                    monitor.checkCancelled();
                }
                catch (CancelledException error) {
                    interrupted = true;
                    break;
                }

                String address = formatAddress(function.getEntryPoint().getOffset(), addressWidth);
                String name = sanitizeFunctionName(function.getName());
                String functionId = functionIdsByAddress.get(function.getEntryPoint().toString());

                if (!targetAddresses.isEmpty() && !targetAddresses.contains(address)) {
                    addFailure(records, failures, sessionId, functionId, address, name,
                        "decompiler_not_targeted");
                    continue;
                }

                if (!decompilerReady) {
                    addFailure(records, failures, sessionId, functionId, address, name,
                        "decompiler_failed_to_start");
                    continue;
                }

                try {
                    DecompileResults results =
                        decompiler.decompileFunction(function, timeoutSeconds, monitor);
                    if (results == null || results.isTimedOut()) {
                        addFailure(records, failures, sessionId, functionId, address, name,
                            "decompiler_timeout");
                    }
                    else if (results.isCancelled()) {
                        addFailure(records, failures, sessionId, functionId, address, name,
                            "decompiler_cancelled");
                        interrupted = true;
                    }
                    else if (results.failedToStart()) {
                        addFailure(records, failures, sessionId, functionId, address, name,
                            "decompiler_failed_to_start");
                    }
                    else if (!results.decompileCompleted()) {
                        addFailure(records, failures, sessionId, functionId, address, name,
                            "decompiler_error");
                    }
                    else if (results.getDecompiledFunction() == null ||
                             results.getDecompiledFunction().getC() == null ||
                             results.getDecompiledFunction().getC().trim().isEmpty()) {
                        addFailure(records, failures, sessionId, functionId, address, name,
                            "decompiler_no_c_output");
                    }
                    else {
                        String outputName = address.substring(2) + "_" + name + ".c";
                        String cCode = normalizeCOutput(results.getDecompiledFunction().getC());
                        Path outputPath = export.resolve(outputName);
                        writeNew(outputPath, cCode.getBytes(StandardCharsets.UTF_8));
                        String outputSha256 = sha256(outputPath);
                        Map<String, Object> record = functionRecordBase(
                            sessionId,
                            functionId,
                            address,
                            name
                        );
                        record.put("decompileStatus", "success");
                        record.put("outputPath", outputName);
                        record.put("outputSha256", outputSha256);
                        records.add(record);
                        exportOutputs.add(exportOutput(outputName, outputSha256));
                    }
                }
                catch (Exception error) {
                    addFailure(records, failures, sessionId, functionId, address, name,
                        "decompiler_error");
                }
                finally {
                    decompiler.flushCache();
                }

                if (interrupted) {
                    break;
                }
            }
        }
        finally {
            decompiler.dispose();
        }

        List<Map<String, Object>> callGraph = new ArrayList<>();
        if (!interrupted) {
            try {
                callGraph = buildCallGraph(sessionId, recordedFunctions, functionIdsByAddress);
            }
            catch (CancelledException error) {
                interrupted = true;
            }
        }

        exportOutputs.sort(Comparator.comparing(entry -> entry.get("path")));
        writeJsonl(functionRecordsPath, records);
        Map<String, Object> failureLedger = new LinkedHashMap<>();
        failureLedger.put("version", FAILURE_LEDGER_VERSION);
        failureLedger.put("sessionId", sessionId);
        failureLedger.put("failures", failures);
        writeJson(failureLedgerPath, failureLedger);
        writeJsonl(callGraphPath, callGraph);

        String completionMarker = "interrupted";
        if (!interrupted) {
            completionMarker = "ghidra-export-complete";
        }
        Map<String, Object> attestation = createAttestation(
            sessionId,
            completionMarker,
            inputBinary,
            peIdentity,
            toolDistribution,
            projectId,
            projectSnapshot,
            analyzerConfig,
            invocationLog,
            exporterScript,
            relocationPolicy,
            targetAddresses,
            functionRecordsPath,
            failureLedgerPath,
            callGraphPath,
            exportOutputs
        );
        writeJson(attestationPath, attestation);

        println("Aurora lineage v2 export: " + completionMarker +
            ", functions=" + records.size() +
            ", failures=" + failures.size() +
            ", edges=" + callGraph.size());
    }

    private List<Function> discoverFunctions() {
        List<Function> functions = new ArrayList<>();
        FunctionIterator iterator = currentProgram.getFunctionManager().getFunctions(true);
        while (iterator.hasNext()) {
            functions.add(iterator.next());
        }
        return functions;
    }

    private List<Map<String, Object>> buildCallGraph(
        String sessionId,
        List<Function> functions,
        Map<String, String> functionIdsByAddress
    ) throws CancelledException {
        Set<String> edges = new TreeSet<>();
        for (Function function : functions) {
            monitor.checkCancelled();
            String from = functionIdsByAddress.get(function.getEntryPoint().toString());
            if (from == null) {
                continue;
            }
            Set<Function> calledFunctions = function.getCalledFunctions(monitor);
            for (Function called : calledFunctions) {
                String to = functionIdsByAddress.get(called.getEntryPoint().toString());
                if (to != null) {
                    edges.add(from + "\u0000" + to);
                }
            }
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (String edge : edges) {
            int separator = edge.indexOf('\u0000');
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("sessionId", sessionId);
            record.put("fromFunctionId", edge.substring(0, separator));
            record.put("toFunctionId", edge.substring(separator + 1));
            result.add(record);
        }
        return result;
    }

    private Map<String, Object> createAttestation(
        String sessionId,
        String completionMarker,
        Path inputBinary,
        Map<String, Object> peIdentity,
        Path toolDistribution,
        String projectId,
        Path projectSnapshot,
        Path analyzerConfig,
        Path invocationLog,
        Path exporterScript,
        String relocationPolicy,
        Set<String> targetAddresses,
        Path functionRecordsPath,
        Path failureLedgerPath,
        Path callGraphPath,
        List<Map<String, String>> exportOutputs
    ) throws IOException, NoSuchAlgorithmException {
        Map<String, Object> attestation = new LinkedHashMap<>();
        attestation.put("version", ATTESTATION_VERSION);
        attestation.put("sessionId", sessionId);
        attestation.put("completionMarker", completionMarker);

        Map<String, Object> input = new LinkedHashMap<>();
        input.put("sha256", sha256(inputBinary));
        input.put("pe", peIdentity);
        attestation.put("inputBinary", input);

        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", "Ghidra");
        tool.put("version", Application.getApplicationVersion());
        tool.put(
            "build",
            Application.getApplicationReleaseName() + "-" + Application.getBuildDate()
        );
        tool.put("distributionSha256", sha256(toolDistribution));
        attestation.put("tool", tool);

        Map<String, Object> project = new LinkedHashMap<>();
        project.put("id", projectId);
        project.put("snapshotSha256", sha256(projectSnapshot));
        attestation.put("project", project);

        Map<String, Object> analysis = new LinkedHashMap<>();
        analysis.put("loader", currentProgram.getExecutableFormat());
        analysis.put("language", currentProgram.getLanguageID().getIdAsString());
        analysis.put("imageBase", peIdentity.get("imageBase"));
        analysis.put("relocationPolicy", relocationPolicy);
        analysis.put("analyzerConfigurationSha256", sha256(analyzerConfig));
        attestation.put("analysis", analysis);

        Map<String, Object> generation = new LinkedHashMap<>();
        generation.put("invocationLogSha256", sha256(invocationLog));
        generation.put("exporterScriptSha256s", Collections.singletonList(sha256(exporterScript)));
        generation.put("functionRecordsSha256", sha256(functionRecordsPath));
        generation.put("failureLedgerSha256", sha256(failureLedgerPath));
        generation.put("callGraphSha256", sha256(callGraphPath));
        generation.put("exportOutputs", exportOutputs);
        Map<String, Object> decompilationSelection = new LinkedHashMap<>();
        decompilationSelection.put(
            "mode",
            targetAddresses.isEmpty() ? "full" : "targeted"
        );
        decompilationSelection.put("addresses", new ArrayList<>(targetAddresses));
        generation.put("decompilationSelection", decompilationSelection);
        attestation.put("generation", generation);
        return attestation;
    }

    private void validateProgramIdentity(Path inputBinary, Map<String, Object> peIdentity)
        throws IOException, NoSuchAlgorithmException {
        String executableFormat = currentProgram.getExecutableFormat();
        if (executableFormat == null ||
            !executableFormat.toLowerCase(Locale.ROOT).contains("portable executable")) {
            throw new IllegalArgumentException("lineage_program_loader_not_pe");
        }
        String programSha256 = currentProgram.getExecutableSHA256();
        if (programSha256 != null && !programSha256.trim().isEmpty() &&
            !programSha256.equalsIgnoreCase(sha256(inputBinary))) {
            throw new IllegalArgumentException("lineage_program_input_hash_mismatch");
        }
        int width = "PE32".equals(peIdentity.get("format")) ? 8 : 16;
        String programImageBase = formatAddress(currentProgram.getImageBase().getOffset(), width);
        if (!programImageBase.equals(peIdentity.get("imageBase"))) {
            throw new IllegalArgumentException("lineage_program_image_base_mismatch");
        }
        String expectedWidth = width == 8 ? ":32:" : ":64:";
        if (!currentProgram.getLanguageID().getIdAsString().contains(expectedWidth)) {
            throw new IllegalArgumentException("lineage_program_language_width_mismatch");
        }
    }

    private static Map<String, Object> functionRecordBase(
        String sessionId,
        String functionId,
        String address,
        String name
    ) {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("sessionId", sessionId);
        record.put("functionId", functionId);
        record.put("address", address);
        record.put("name", name);
        return record;
    }

    private static void addFailure(
        List<Map<String, Object>> records,
        List<Map<String, Object>> failures,
        String sessionId,
        String functionId,
        String address,
        String name,
        String reasonCode
    ) {
        Map<String, Object> record = functionRecordBase(
            sessionId,
            functionId,
            address,
            name
        );
        record.put("decompileStatus", "failure");
        record.put("failureReasonCode", reasonCode);
        records.add(record);
        Map<String, Object> failure = new LinkedHashMap<>();
        failure.put("functionId", functionId);
        failure.put("reasonCode", reasonCode);
        failures.add(failure);
    }

    private static Map<String, String> exportOutput(String path, String hash) {
        Map<String, String> output = new LinkedHashMap<>();
        output.put("path", path);
        output.put("sha256", hash);
        return output;
    }

    private static Map<String, String> parseArguments(String[] scriptArguments) {
        Map<String, String> parsed = new LinkedHashMap<>();
        for (int index = 0; index < scriptArguments.length; index++) {
            String token = scriptArguments[index];
            if (!token.startsWith("--") || token.length() == 2) {
                throw new IllegalArgumentException("lineage_argument_invalid:" + token);
            }
            String key;
            String value;
            int equals = token.indexOf('=');
            if (equals > 2) {
                key = token.substring(2, equals);
                value = token.substring(equals + 1);
            }
            else {
                key = token.substring(2);
                if (index + 1 >= scriptArguments.length ||
                    scriptArguments[index + 1].startsWith("--")) {
                    throw new IllegalArgumentException("lineage_argument_value_missing:" + key);
                }
                value = scriptArguments[++index];
            }
            if (value.trim().isEmpty()) {
                throw new IllegalArgumentException("lineage_argument_value_empty:" + key);
            }
            if (parsed.put(key, value) != null) {
                throw new IllegalArgumentException("lineage_argument_duplicate:" + key);
            }
        }
        return parsed;
    }

    private static String requireArgument(Map<String, String> arguments, String name) {
        String value = arguments.get(name);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("lineage_required_argument_missing:" + name);
        }
        return value;
    }

    private static int parsePositiveInt(String value, String name) {
        try {
            int parsed = Integer.parseInt(value);
            if (parsed <= 0) {
                throw new NumberFormatException("not positive");
            }
            return parsed;
        }
        catch (NumberFormatException error) {
            throw new IllegalArgumentException("lineage_argument_not_positive_integer:" + name);
        }
    }

    private static Set<String> parseTargetAddresses(String value, int addressWidth) {
        Set<String> targets = new TreeSet<>();
        if (value == null) {
            return targets;
        }
        String pattern = "0x[0-9a-f]{" + addressWidth + "}";
        for (String token : value.split(",", -1)) {
            if (!token.matches(pattern)) {
                throw new IllegalArgumentException(
                    "lineage_target_address_invalid:" + token
                );
            }
            if (!targets.add(token)) {
                throw new IllegalArgumentException(
                    "lineage_target_address_duplicate:" + token
                );
            }
        }
        return targets;
    }

    private static String decodeTargetAddresses(Map<String, String> arguments) {
        String direct = arguments.get("target-addresses");
        String encoded = arguments.get("target-addresses-base64url");
        if (direct != null && encoded != null) {
            throw new IllegalArgumentException("lineage_target_address_transport_conflict");
        }
        if (encoded == null) {
            return direct;
        }
        if (!encoded.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("lineage_target_address_base64url_invalid");
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(encoded);
            String canonical = Base64.getUrlEncoder().withoutPadding().encodeToString(decoded);
            if (!canonical.equals(encoded)) {
                throw new IllegalArgumentException(
                    "lineage_target_address_base64url_noncanonical"
                );
            }
            return new String(decoded, StandardCharsets.UTF_8);
        }
        catch (IllegalArgumentException error) {
            if (error.getMessage() != null &&
                error.getMessage().startsWith("lineage_target_address_")) {
                throw error;
            }
            throw new IllegalArgumentException(
                "lineage_target_address_base64url_invalid",
                error
            );
        }
    }

    private static void validateSessionId(String sessionId) {
        if (!sessionId.matches("ghidra-session-[A-Za-z0-9_-]{8,}")) {
            throw new IllegalArgumentException("lineage_session_id_invalid");
        }
    }

    private static Path requirePacketRoot(String value) throws IOException {
        Path root = Paths.get(value).toAbsolutePath().normalize();
        if (Files.isSymbolicLink(root) ||
            !Files.isDirectory(root, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException("lineage_packet_root_invalid");
        }
        return root.toRealPath(LinkOption.NOFOLLOW_LINKS);
    }

    private static Path requireRegularInput(Path root, String value, String code)
        throws IOException {
        Path candidate = Paths.get(value).toAbsolutePath().normalize();
        requireRegularFile(candidate, code);
        Path real = candidate.toRealPath(LinkOption.NOFOLLOW_LINKS);
        requireInsideRoot(root, real, code + "_outside_packet_root");
        return real;
    }

    private static void requireRegularFile(Path path, String code) {
        if (Files.isSymbolicLink(path) ||
            !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException(code);
        }
    }

    private static Path requireOutputDirectory(Path root, Path directory) throws IOException {
        requireInsideRoot(root, directory.toAbsolutePath().normalize(),
            "lineage_output_directory_outside_packet_root");
        if (Files.exists(directory, LinkOption.NOFOLLOW_LINKS)) {
            if (Files.isSymbolicLink(directory) ||
                !Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)) {
                throw new IllegalArgumentException("lineage_output_directory_invalid");
            }
        }
        else {
            Files.createDirectories(directory);
        }
        return directory;
    }

    private static void requireInsideRoot(Path root, Path candidate, String code) {
        if (!candidate.startsWith(root)) {
            throw new IllegalArgumentException(code);
        }
    }

    private static void requireEmptyDirectory(Path directory, String code) throws IOException {
        try (DirectoryStream<Path> entries = Files.newDirectoryStream(directory)) {
            if (entries.iterator().hasNext()) {
                throw new IllegalArgumentException(code);
            }
        }
    }

    private static void requireOutputsAbsent(Path... paths) {
        for (Path path : paths) {
            if (Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
                throw new IllegalArgumentException("lineage_output_already_exists:" +
                    path.getFileName());
            }
        }
    }

    private static Map<String, Object> parsePortableExecutable(Path path) throws IOException {
        try (RandomAccessFile file = new RandomAccessFile(path.toFile(), "r")) {
            if (file.length() < 256 || readU16(file, 0) != 0x5a4d) {
                throw new IllegalArgumentException("lineage_input_binary_pe_invalid");
            }
            long peOffset = readU32(file, 0x3c);
            if (peOffset < 0x40 || peOffset + 64 > file.length() ||
                readU32(file, peOffset) != 0x00004550L) {
                throw new IllegalArgumentException("lineage_input_binary_pe_invalid");
            }
            int machine = readU16(file, peOffset + 4);
            long timestamp = readU32(file, peOffset + 8);
            int optionalMagic = readU16(file, peOffset + 24);
            String format;
            long imageBase;
            if (optionalMagic == 0x010b) {
                format = "PE32";
                imageBase = readU32(file, peOffset + 24 + 28);
            }
            else if (optionalMagic == 0x020b) {
                format = "PE32+";
                imageBase = readU64(file, peOffset + 24 + 24);
            }
            else {
                throw new IllegalArgumentException("lineage_input_binary_pe_optional_header_invalid");
            }
            Map<String, Object> identity = new LinkedHashMap<>();
            identity.put("format", format);
            identity.put("machine", String.format(Locale.ROOT, "0x%04x", machine));
            identity.put("timestamp", String.format(Locale.ROOT, "0x%08x", timestamp));
            identity.put("optionalHeaderMagic",
                String.format(Locale.ROOT, "0x%04x", optionalMagic));
            identity.put("imageBase", formatAddress(imageBase, "PE32".equals(format) ? 8 : 16));
            return identity;
        }
    }

    private static int readU16(RandomAccessFile file, long offset) throws IOException {
        file.seek(offset);
        int first = file.read();
        int second = file.read();
        if (first < 0 || second < 0) {
            throw new IllegalArgumentException("lineage_input_binary_pe_truncated");
        }
        return first | (second << 8);
    }

    private static long readU32(RandomAccessFile file, long offset) throws IOException {
        return ((long) readU16(file, offset) & 0xffffL) |
            (((long) readU16(file, offset + 2) & 0xffffL) << 16);
    }

    private static long readU64(RandomAccessFile file, long offset) throws IOException {
        long low = readU32(file, offset);
        long high = readU32(file, offset + 4);
        return low | (high << 32);
    }

    private static String formatAddress(long value, int width) {
        String hex = Long.toHexString(value).toLowerCase(Locale.ROOT);
        if (hex.length() > width) {
            hex = hex.substring(hex.length() - width);
        }
        StringBuilder padded = new StringBuilder(width + 2).append("0x");
        for (int index = hex.length(); index < width; index++) {
            padded.append('0');
        }
        return padded.append(hex).toString();
    }

    private static String sanitizeFunctionName(String value) {
        String sanitized = value == null ? "" : value.replaceAll("[^A-Za-z0-9_?$@]", "_");
        return sanitized.isEmpty() ? "FUN" : sanitized;
    }

    private static String normalizeCOutput(String value) {
        String normalized = value.replace("\r\n", "\n").replace('\r', '\n');
        return normalized.endsWith("\n") ? normalized : normalized + "\n";
    }

    private static String sha256(Path path) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[64 * 1024];
        try (java.io.InputStream input = Files.newInputStream(path)) {
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (read > 0) {
                    digest.update(buffer, 0, read);
                }
            }
        }
        StringBuilder result = new StringBuilder(64);
        for (byte value : digest.digest()) {
            result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        }
        return result.toString();
    }

    private static void writeJsonl(Path path, List<? extends Map<String, ?>> records)
        throws IOException {
        StringBuilder output = new StringBuilder();
        for (Map<String, ?> record : records) {
            output.append(toJson(record)).append('\n');
        }
        writeNew(path, output.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static void writeJson(Path path, Map<String, ?> value) throws IOException {
        writeNew(path, (toJson(value) + "\n").getBytes(StandardCharsets.UTF_8));
    }

    private static void writeNew(Path path, byte[] contents) throws IOException {
        Files.write(path, contents, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
    }

    private static String toJson(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String) {
            return quoteJson((String) value);
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        if (value instanceof Map<?, ?>) {
            StringBuilder output = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                if (!first) {
                    output.append(',');
                }
                first = false;
                output.append(quoteJson(String.valueOf(entry.getKey())));
                output.append(':').append(toJson(entry.getValue()));
            }
            return output.append('}').toString();
        }
        if (value instanceof Iterable<?>) {
            StringBuilder output = new StringBuilder("[");
            boolean first = true;
            for (Object entry : (Iterable<?>) value) {
                if (!first) {
                    output.append(',');
                }
                first = false;
                output.append(toJson(entry));
            }
            return output.append(']').toString();
        }
        throw new IllegalArgumentException("lineage_json_value_unsupported");
    }

    private static String quoteJson(String value) {
        StringBuilder output = new StringBuilder("\"");
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '\"': output.append("\\\""); break;
                case '\\': output.append("\\\\"); break;
                case '\b': output.append("\\b"); break;
                case '\f': output.append("\\f"); break;
                case '\n': output.append("\\n"); break;
                case '\r': output.append("\\r"); break;
                case '\t': output.append("\\t"); break;
                default:
                    if (character < 0x20) {
                        output.append(String.format(Locale.ROOT, "\\u%04x", (int) character));
                    }
                    else {
                        output.append(character);
                    }
            }
        }
        return output.append('\"').toString();
    }
}
