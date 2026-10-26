using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CreatorPubli.Api.Contracts;

// Horários como "HH:mm", igual ao <input type="time"> e ao digestTime do frontend.
public class TimeOnlyConverter : JsonConverter<TimeOnly>
{
    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        TimeOnly.Parse(reader.GetString()!, CultureInfo.InvariantCulture);

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString("HH:mm", CultureInfo.InvariantCulture));
}
