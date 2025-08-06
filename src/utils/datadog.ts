// Initialize Datadog tracing - this must be imported before any other modules
import tracer from 'dd-trace';

// Only initialize in Lambda environment
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    tracer.init({
        logInjection: true, // Inject trace IDs into logs
        service: 'cintra-taskmaster',
        env: process.env.DD_ENV || 'production',
        version: process.env.DD_VERSION || '1.0.0',
        runtimeMetrics: true,
        profiling: true
    });
}

export default tracer;